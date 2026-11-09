// Package content contains the release-versioned Agent Guide source tree.
package content

import "embed"

// All entries recurse into apth, apthctl, concepts, lessons and skills. The
// wildcard also keeps builds possible while the content tree is being authored;
// the loader ignores Go source and marks an empty guide unready.
//
//go:embed all:*
var Files embed.FS
