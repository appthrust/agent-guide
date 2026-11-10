import { useSuspenseQuery } from '@tanstack/react-query'
import { docQuery } from '../../api/queries'
import { useText } from '../../i18n'
import { useDocumentTitle } from '../../ui'
import { DocArticle } from './doc-article'

export function DocPage({ slug }: { slug: string }) {
  const { language } = useText()
  const { data: doc } = useSuspenseQuery(docQuery(slug, language))
  useDocumentTitle(doc.title)
  return (
    <div className="max-w-3xl">
      <DocArticle doc={doc} />
    </div>
  )
}
