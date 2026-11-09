// Package content validates and renders the embedded guide before serving it.
package content

import (
	"cmp"
	"fmt"
	"io"
	"io/fs"
	"path"
	"slices"
	"strings"

	"github.com/appthrust/agent-guide/cmd/server/internal/render"
	"gopkg.in/yaml.v3"
)

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
}

type Document struct {
	Metadata `yaml:",inline"`
	Sources  []Source `yaml:"sources" json:"sources"`
	Markdown string   `yaml:"-" json:"markdown"`
}

// Detail deliberately excludes order: its shape is distinct from the index.
type Detail struct {
	Slug     string   `json:"slug"`
	Title    string   `json:"title"`
	Summary  string   `json:"summary"`
	Audience string   `json:"audience"`
	Section  string   `json:"section"`
	Tags     []string `json:"tags"`
	Sources  []Source `json:"sources"`
	Markdown string   `json:"markdown"`
}

func (d Document) Detail() Detail {
	return Detail{d.Slug, d.Title, d.Summary, d.Audience, d.Section, d.Tags, d.Sources, d.Markdown}
}

type Skill struct {
	Name        string   `yaml:"name" json:"name"`
	Description string   `yaml:"description" json:"description"`
	Files       []string `yaml:"-" json:"files"`
}

type Catalog struct {
	Docs       []Metadata
	Documents  map[string]Document
	Skills     []Skill
	SkillFiles map[string]string
	Index      string
	Full       string
}

var sections = []struct{ Key, Title string }{
	{"start-here", "Start here"},
	{"apth", "apth"},
	{"apthctl", "apthctl (operators)"},
	{"concepts", "Concepts"},
	{"lessons", "Lessons"},
}

func sectionOrder(key string) int {
	return slices.IndexFunc(sections, func(section struct{ Key, Title string }) bool { return section.Key == key })
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

func parseDocument(name, text string, values render.Values) (Document, error) {
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
	document.Slug = strings.TrimSuffix(name, ".md")
	document.Markdown, err = render.Markdown(name, body, values)
	if err != nil {
		return Document{}, err
	}
	return document, nil
}

func Load(files fs.FS, values render.Values) (*Catalog, error) {
	catalog := &Catalog{Docs: []Metadata{}, Documents: map[string]Document{}, Skills: []Skill{}, SkillFiles: map[string]string{}}
	skillNames := map[string]bool{}
	err := fs.WalkDir(files, ".", func(name string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			return nil
		}
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
			if parts[2] == "SKILL.md" {
				var skill Skill
				if _, err := frontmatter(name, string(data), &skill, false); err != nil {
					return err
				}
				if skill.Name != parts[1] || strings.TrimSpace(skill.Description) == "" {
					return fmt.Errorf("%s: skill name must match directory and description is required", name)
				}
				catalog.Skills = append(catalog.Skills, skill)
			}
			rendered, err := render.Markdown(name, string(data), values)
			if err != nil {
				return err
			}
			catalog.SkillFiles[strings.TrimPrefix(name, "skills/")] = rendered
			return nil
		}
		if path.Ext(name) != ".md" {
			return nil
		}
		data, err := fs.ReadFile(files, name)
		if err != nil {
			return err
		}
		document, err := parseDocument(name, string(data), values)
		if err != nil {
			return err
		}
		catalog.Docs = append(catalog.Docs, document.Metadata)
		catalog.Documents[document.Slug] = document
		return nil
	})
	if err != nil {
		return nil, err
	}
	if len(catalog.Docs) == 0 {
		return nil, fmt.Errorf("content contains no documents")
	}
	for name := range skillNames {
		if _, ok := catalog.SkillFiles[name+"/SKILL.md"]; !ok {
			return nil, fmt.Errorf("skills/%s: SKILL.md is required", name)
		}
	}
	slices.SortFunc(catalog.Docs, func(a, b Metadata) int {
		return cmp.Or(cmp.Compare(sectionOrder(a.Section), sectionOrder(b.Section)), cmp.Compare(a.Order, b.Order), strings.Compare(a.Title, b.Title), strings.Compare(a.Slug, b.Slug))
	})
	slices.SortFunc(catalog.Skills, func(a, b Skill) int { return strings.Compare(a.Name, b.Name) })
	for i := range catalog.Skills {
		skill := &catalog.Skills[i]
		skill.Files = []string{"SKILL.md"}
		for name := range catalog.SkillFiles {
			if file, ok := strings.CutPrefix(name, skill.Name+"/"); ok && file != "SKILL.md" {
				skill.Files = append(skill.Files, file)
			}
		}
		slices.Sort(skill.Files[1:])
	}
	catalog.buildIndexes(values.PublicURL)
	return catalog, nil
}

func (c *Catalog) buildIndexes(publicURL string) {
	var index, full strings.Builder
	index.WriteString("# Agent Guide\n\n> Environment-bound guide, skills and llms.txt for operating this AppThrust Project with apth and apthctl.\n")
	lastSection := ""
	for _, metadata := range c.Docs {
		if metadata.Section != lastSection {
			fmt.Fprintf(&index, "\n## %s\n\n", sections[sectionOrder(metadata.Section)].Title)
			lastSection = metadata.Section
		}
		fmt.Fprintf(&index, "- [%s](%s/md/%s.md): %s\n", metadata.Title, publicURL, metadata.Slug, metadata.Summary)
		document := c.Documents[metadata.Slug]
		fmt.Fprintf(&full, "# %s\n\n%s\n\n", document.Title, strings.TrimSpace(document.Markdown))
	}
	index.WriteString("\n## Skills\n\n")
	for _, skill := range c.Skills {
		fmt.Fprintf(&index, "- [%s](%s/skills/%s/SKILL.md): %s\n", skill.Name, publicURL, skill.Name, skill.Description)
	}
	c.Index, c.Full = index.String(), full.String()
}
