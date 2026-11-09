import { useSuspenseQuery } from '@tanstack/react-query'
import { docQuery } from '../../api/queries'
import { useDocumentTitle } from '../../ui'
import { DocArticle } from './doc-article'

export function DocPage({ slug }: { slug: string }) {
  const { data: doc } = useSuspenseQuery(docQuery(slug))
  useDocumentTitle(doc.title)
  return (
    <div className="max-w-3xl">
      <DocArticle doc={doc} />
    </div>
  )
}
