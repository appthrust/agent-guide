// Package content validates and renders the embedded guide before serving it.
package content

import (
	"cmp"
	"fmt"
	"io"
	"io/fs"
	"maps"
	"path"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"github.com/appthrust/agent-guide/cmd/server/internal/render"
	"gopkg.in/yaml.v3"
)

// English is the source language and the fallback for a missing variant.
const (
	English  = "en"
	Japanese = "ja"
)

// variantSuffix marks a Japanese variant beside its English file:
// `apth/install.ja.md` translates `apth/install.md`.
const variantSuffix = ".ja.md"

type Source struct {
	Path     string `yaml:"path" json:"path"`
	Revision string `yaml:"revision" json:"revision"`
}

type Metadata struct {
	Slug     string   `yaml:"-" json:"slug"`
	Title    string   `yaml:"title" json:"title"`
	Summary  string   `yaml:"summary" json:"summary"`
	Audience string   `yaml:"audience" json:"audience"`
	Section  string   `yaml:"section" json:"section"`
	Order    int      `yaml:"order" json:"order"`
	Tags     []string `yaml:"tags" json:"tags"`
	// Lang is the language actually served; it is English when the requested variant is missing.
	Lang           string   `yaml:"-" json:"lang"`
	AvailableLangs []string `yaml:"-" json:"availableLangs"`
}

type Document struct {
	Metadata `yaml:",inline"`
	Sources  []Source `yaml:"sources" json:"sources"`
	Markdown string   `yaml:"-" json:"markdown"`
}

// Detail deliberately excludes order: its shape is distinct from the index.
type Detail struct {
	Slug           string   `json:"slug"`
	Title          string   `json:"title"`
	Summary        string   `json:"summary"`
	Audience       string   `json:"audience"`
	Section        string   `json:"section"`
	Tags           []string `json:"tags"`
	Sources        []Source `json:"sources"`
	Markdown       string   `json:"markdown"`
	Lang           string   `json:"lang"`
	AvailableLangs []string `json:"availableLangs"`
}

func (d Document) Detail() Detail {
	return Detail{d.Slug, d.Title, d.Summary, d.Audience, d.Section, d.Tags, d.Sources, d.Markdown, d.Lang, d.AvailableLangs}
}

type Skill struct {
	Name           string   `yaml:"name" json:"name"`
	Description    string   `yaml:"description" json:"description"`
	Files          []string `yaml:"-" json:"files"`
	Lang           string   `yaml:"-" json:"lang"`
	AvailableLangs []string `yaml:"-" json:"availableLangs"`
}

// Guide is the whole guide in one language. Its documents keep the English
// order so navigation does not reshuffle between languages.
type Guide struct {
	Lang       string
	Docs       []Metadata
	Documents  map[string]Document
	Skills     []Skill
	SkillFiles map[string]string
	Index      string
	Full       string
}

// Catalog holds the English guide and its Japanese variant; every document
// and skill file the Japanese variant lacks is the English one.
type Catalog struct {
	english, japanese *Guide
}

// Guide returns the guide for lang; anything but Japanese is English.
func (c *Catalog) Guide(lang string) *Guide {
	if lang == Japanese {
		return c.japanese
	}
	return c.english
}

// ParseLang maps a language tag (`ja`, `ja-JP`, `EN-us`) to a served language.
func ParseLang(tag string) (string, bool) {
	primary, _, _ := strings.Cut(strings.ToLower(strings.TrimSpace(tag)), "-")
	switch primary {
	case English, Japanese:
		return primary, true
	}
	return "", false
}

// NegotiateLang picks the served language an Accept-Language header prefers
// most (highest q, then header order), else English.
func NegotiateLang(header string) string {
	best, bestQ := English, 0.0
	for _, part := range strings.Split(header, ",") {
		tag, params, _ := strings.Cut(part, ";")
		q := 1.0
		if value, ok := strings.CutPrefix(strings.TrimSpace(params), "q="); ok {
			parsed, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
			if err != nil {
				continue
			}
			q = parsed
		}
		if lang, ok := ParseLang(tag); ok && q > bestQ {
			best, bestQ = lang, q
		}
	}
	return best
}

type section struct{ Key, English, Japanese string }

var sections = []section{
	{"start-here", "Start here", "はじめに"},
	{"apth", "apth", "apth"},
	{"apthctl", "apthctl (operators)", "apthctl（運用者向け）"},
	{"concepts", "Concepts", "基本概念"},
	{"lessons", "Lessons", "過去の教訓"},
}

func sectionOrder(key string) int {
	return slices.IndexFunc(sections, func(s section) bool { return s.Key == key })
}

// indexText is the llms.txt wording that is not document content.
var indexText = map[string]struct{ Lead, Skills string }{
	English:  {"Environment-bound guide, skills and llms.txt for operating this AppThrust Project with apth and apthctl.", "Skills"},
	Japanese: {"apth と apthctl でこの AppThrust Project を操作するための、この環境に合わせたガイド、スキル、llms.txt です。", "スキル"},
}

func frontmatter(name, text string, target any, strict bool) (string, error) {
	text = strings.ReplaceAll(text, "\r\n", "\n")
	if !strings.HasPrefix(text, "---\n") {
		return "", fmt.Errorf("%s: missing frontmatter", name)
	}
	header, body, ok := strings.Cut(text[4:], "\n---\n")
	if !ok {
		return "", fmt.Errorf("%s: unterminated frontmatter", name)
	}
	decoder := yaml.NewDecoder(strings.NewReader(header))
	decoder.KnownFields(strict)
	if err := decoder.Decode(target); err != nil {
		return "", fmt.Errorf("%s: frontmatter: %w", name, err)
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		return "", fmt.Errorf("%s: frontmatter must contain one YAML document", name)
	}
	return body, nil
}

func parseDocument(name, slug, text string, values render.Values) (Document, error) {
	var document Document
	body, err := frontmatter(name, text, &document, true)
	if err != nil {
		return Document{}, err
	}
	if strings.TrimSpace(document.Title) == "" || strings.TrimSpace(document.Summary) == "" || !slices.Contains([]string{"developer", "operator", "both"}, document.Audience) || sectionOrder(document.Section) < 0 || document.Tags == nil || len(document.Sources) == 0 {
		return Document{}, fmt.Errorf("%s: title, summary, valid audience/section, tags and sources are required", name)
	}
	// A pointer distinguishes an explicit order: 0 from a missing field.
	var required struct {
		Order *int `yaml:"order"`
	}
	if _, err := frontmatter(name, text, &required, false); err != nil {
		return Document{}, err
	}
	if required.Order == nil {
		return Document{}, fmt.Errorf("%s: order is required", name)
	}
	for _, source := range document.Sources {
		if !fs.ValidPath(source.Path) || source.Path == "." || strings.TrimSpace(source.Revision) == "" {
			return Document{}, fmt.Errorf("%s: each source requires a repository-relative path and revision", name)
		}
	}
	document.Slug = slug
	document.Markdown, err = render.Markdown(name, body, values)
	if err != nil {
		return Document{}, err
	}
	return document, nil
}

// sameMetadata reports whether a variant keeps every untranslated field of its original.
func sameMetadata(a, b Document) bool {
	return a.Audience == b.Audience && a.Section == b.Section && a.Order == b.Order && slices.Equal(a.Tags, b.Tags) && slices.Equal(a.Sources, b.Sources)
}

func Load(files fs.FS, values render.Values) (*Catalog, error) {
	english := &Guide{Lang: English, Docs: []Metadata{}, Documents: map[string]Document{}, Skills: []Skill{}, SkillFiles: map[string]string{}}
	japaneseDocs := map[string]Document{}
	japaneseSkills := map[string]Skill{}
	japaneseFiles := map[string]string{}
	skillNames := map[string]bool{}
	err := fs.WalkDir(files, ".", func(name string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			return nil
		}
		base, variant := strings.CutSuffix(name, variantSuffix)
		if strings.HasPrefix(name, "skills/") {
			parts := strings.SplitN(name, "/", 3)
			if len(parts) != 3 {
				return fmt.Errorf("%s: skill files must be under skills/<name>/", name)
			}
			data, err := fs.ReadFile(files, name)
			if err != nil {
				return err
			}
			skillNames[parts[1]] = true
			// The variant is keyed by its original's file name: SKILL.ja.md serves as SKILL.md.
			file := strings.TrimPrefix(name, "skills/")
			if variant {
				file = strings.TrimPrefix(base, "skills/") + ".md"
			}
			if path.Base(file) == "SKILL.md" && path.Dir(file) == parts[1] {
				var skill Skill
				if _, err := frontmatter(name, string(data), &skill, false); err != nil {
					return err
				}
				if skill.Name != parts[1] || strings.TrimSpace(skill.Description) == "" {
					return fmt.Errorf("%s: skill name must match directory and description is required", name)
				}
				if variant {
					japaneseSkills[skill.Name] = skill
				} else {
					english.Skills = append(english.Skills, skill)
				}
			}
			rendered, err := render.Markdown(name, string(data), values)
			if err != nil {
				return err
			}
			if variant {
				japaneseFiles[file] = rendered
			} else {
				english.SkillFiles[file] = rendered
			}
			return nil
		}
		if path.Ext(name) != ".md" {
			return nil
		}
		data, err := fs.ReadFile(files, name)
		if err != nil {
			return err
		}
		slug := strings.TrimSuffix(name, ".md")
		if variant {
			slug = base
		}
		document, err := parseDocument(name, slug, string(data), values)
		if err != nil {
			return err
		}
		if variant {
			japaneseDocs[slug] = document
		} else {
			english.Documents[slug] = document
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if len(english.Documents) == 0 {
		return nil, fmt.Errorf("content contains no documents")
	}
	for name := range skillNames {
		if _, ok := english.SkillFiles[name+"/SKILL.md"]; !ok {
			return nil, fmt.Errorf("skills/%s: SKILL.md is required", name)
		}
	}
	for slug, document := range japaneseDocs {
		original, ok := english.Documents[slug]
		if !ok {
			return nil, fmt.Errorf("%s%s: variant has no English %s.md", slug, variantSuffix, slug)
		}
		if !sameMetadata(original, document) {
			return nil, fmt.Errorf("%s%s: audience, section, order, tags and sources must match %s.md", slug, variantSuffix, slug)
		}
	}
	for file := range japaneseFiles {
		if _, ok := english.SkillFiles[file]; !ok {
			return nil, fmt.Errorf("skills/%s%s: variant has no English skills/%s", strings.TrimSuffix(file, ".md"), variantSuffix, file)
		}
	}

	documents := slices.Collect(maps.Values(english.Documents))
	slices.SortFunc(documents, func(a, b Document) int {
		return cmp.Or(cmp.Compare(sectionOrder(a.Section), sectionOrder(b.Section)), cmp.Compare(a.Order, b.Order), strings.Compare(a.Title, b.Title), strings.Compare(a.Slug, b.Slug))
	})
	japanese := &Guide{Lang: Japanese, Docs: []Metadata{}, Documents: map[string]Document{}, Skills: []Skill{}, SkillFiles: maps.Clone(english.SkillFiles)}
	link := japaneseLinks(values.PublicURL, func(target string) bool {
		if slug, ok := strings.CutPrefix(target, "/md/"); ok {
			_, found := japaneseDocs[strings.TrimSuffix(slug, ".md")]
			return found
		}
		_, found := japaneseFiles[strings.TrimPrefix(target, "/skills/")]
		return found
	})
	for file, body := range japaneseFiles {
		japanese.SkillFiles[file] = link(body)
	}
	for _, document := range documents {
		langs := []string{English}
		translated, ok := japaneseDocs[document.Slug]
		if ok {
			langs = append(langs, Japanese)
		}
		document.Lang, document.AvailableLangs = English, langs
		english.Docs = append(english.Docs, document.Metadata)
		english.Documents[document.Slug] = document
		if ok {
			document.Title, document.Summary, document.Markdown, document.Lang = translated.Title, translated.Summary, link(translated.Markdown), Japanese
		}
		japanese.Docs = append(japanese.Docs, document.Metadata)
		japanese.Documents[document.Slug] = document
	}

	slices.SortFunc(english.Skills, func(a, b Skill) int { return strings.Compare(a.Name, b.Name) })
	for i := range english.Skills {
		skill := &english.Skills[i]
		skill.Files = []string{"SKILL.md"}
		for name := range english.SkillFiles {
			if file, ok := strings.CutPrefix(name, skill.Name+"/"); ok && file != "SKILL.md" {
				skill.Files = append(skill.Files, file)
			}
		}
		slices.Sort(skill.Files[1:])
		skill.Lang, skill.AvailableLangs = English, []string{English}
		translated, ok := japaneseSkills[skill.Name]
		if ok {
			skill.AvailableLangs = []string{English, Japanese}
		}
		variant := *skill
		if ok {
			variant.Description, variant.Lang = translated.Description, Japanese
		}
		japanese.Skills = append(japanese.Skills, variant)
	}
	english.buildIndexes(values.PublicURL)
	japanese.buildIndexes(values.PublicURL)
	return &Catalog{english: english, japanese: japanese}, nil
}

// langQuery is the link suffix that keeps an agent on the variant it is reading.
func langQuery(lang string) string {
	if lang == English {
		return ""
	}
	return "?lang=" + lang
}

// japaneseLinks returns a rewriter that points a Japanese variant's links to
// guide documents and skill files at their Japanese variants (`?lang=ja`), so
// a reader who follows a link stays in Japanese. Only links to this
// installation's text routes whose target has a variant change.
func japaneseLinks(publicURL string, translated func(target string) bool) func(string) string {
	pattern := regexp.MustCompile(`\]\(` + regexp.QuoteMeta(publicURL) + `(/md/[^)\s?#]+\.md|/skills/[^)\s?#]+\.md)\)`)
	return func(markdown string) string {
		return pattern.ReplaceAllStringFunc(markdown, func(match string) string {
			target := pattern.FindStringSubmatch(match)[1]
			if !translated(target) {
				return match
			}
			return strings.TrimSuffix(match, ")") + langQuery(Japanese) + ")"
		})
	}
}

func (g *Guide) buildIndexes(publicURL string) {
	text := indexText[g.Lang]
	var index, full strings.Builder
	fmt.Fprintf(&index, "# Agent Guide\n\n> %s\n", text.Lead)
	lastSection := ""
	for _, metadata := range g.Docs {
		if metadata.Section != lastSection {
			title := sections[sectionOrder(metadata.Section)].English
			if g.Lang == Japanese {
				title = sections[sectionOrder(metadata.Section)].Japanese
			}
			fmt.Fprintf(&index, "\n## %s\n\n", title)
			lastSection = metadata.Section
		}
		fmt.Fprintf(&index, "- [%s](%s/md/%s.md%s): %s\n", metadata.Title, publicURL, metadata.Slug, langQuery(metadata.Lang), metadata.Summary)
		document := g.Documents[metadata.Slug]
		fmt.Fprintf(&full, "# %s\n\n%s\n\n", document.Title, strings.TrimSpace(document.Markdown))
	}
	fmt.Fprintf(&index, "\n## %s\n\n", text.Skills)
	for _, skill := range g.Skills {
		fmt.Fprintf(&index, "- [%s](%s/skills/%s/SKILL.md%s): %s\n", skill.Name, publicURL, skill.Name, langQuery(skill.Lang), skill.Description)
	}
	g.Index, g.Full = index.String(), full.String()
}
