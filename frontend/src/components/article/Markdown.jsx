/**
 * Minimal, dependency-free Markdown renderer.
 *
 * Article drafts are stored as raw Markdown, so the public article page
 * renders them here. Everything is produced as React elements and never as an
 * HTML string, so no `dangerouslySetInnerHTML` is involved and article content
 * cannot inject markup or scripts. Link targets are additionally restricted to
 * http/https/mailto plus same-page fragments.
 *
 * Supported: ATX headings, paragraphs, bold/italic/inline code, links,
 * unordered + ordered lists (with nesting), blockquotes, fenced code blocks,
 * and thematic breaks.
 */

const HEADING = /^\s{0,3}(#{1,6})\s+(.*)$/
const FENCE = /^\s*(?:```|~~~)\s*([\w+-]*)\s*$/
const THEMATIC_BREAK = /^\s*(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/
const BLOCKQUOTE = /^\s*>\s?(.*)$/
const UNORDERED_ITEM = /^(\s*)[-*+]\s+(.*)$/
const ORDERED_ITEM = /^(\s*)\d+[.)]\s+(.*)$/
const SAFE_HREF = /^(?:https?:|mailto:)/i

// A fresh regex per call keeps the recursive inline calls from sharing
// `lastIndex` with the loop that is iterating them. Italics are `*`-only so
// that identifiers such as `snake_case` are left intact.
const inlinePattern = () => /(\*\*|__)([\s\S]+?)\1|\*([^*\n]+?)\*|`([^`\n]+)`|\[([^\]]*)\]\(([^)\s]+)\)/g

const isSafeHref = (href) => {
    const value = String(href || '').trim()
    if (!value) return false
    if (value.startsWith('/') || value.startsWith('#')) return true
    return SAFE_HREF.test(value)
}

const renderInline = (text, keyPrefix) => {
    const pattern = inlinePattern()
    const nodes = []
    let lastIndex = 0
    let match

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
        const [token, , bold, italic, code, linkText, linkHref] = match
        const key = `${keyPrefix}-${match.index}`

        if (bold !== undefined) {
            nodes.push(<strong key={key}>{renderInline(bold, `${key}-b`)}</strong>)
        } else if (italic !== undefined) {
            nodes.push(<em key={key}>{renderInline(italic, `${key}-i`)}</em>)
        } else if (code !== undefined) {
            nodes.push(<code key={key}>{code}</code>)
        } else if (linkHref !== undefined) {
            nodes.push(isSafeHref(linkHref)
                ? <a key={key} href={linkHref} target="_blank" rel="noreferrer">{linkText || linkHref}</a>
                : linkText || linkHref)
        }

        lastIndex = match.index + token.length
    }
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
    return nodes
}

const listItemPattern = (line) => {
    const unordered = line.match(UNORDERED_ITEM)
    if (unordered) return { indent: unordered[1].length, ordered: false, text: unordered[2] }
    const ordered = line.match(ORDERED_ITEM)
    if (ordered) return { indent: ordered[1].length, ordered: true, text: ordered[2] }
    return null
}

const buildListTree = (items) => {
    const root = { children: [] }
    const stack = [{ indent: -1, node: root }]

    for (const item of items) {
        while (stack.length > 1 && item.indent <= stack[stack.length - 1].indent) stack.pop()
        const parent = stack[stack.length - 1].node
        const node = { ...item, children: [] }
        parent.children.push(node)
        stack.push({ indent: item.indent, node })
    }
    return root.children
}

const renderList = (nodes, keyPrefix) => {
    if (!nodes.length) return null
    const ordered = nodes[0].ordered
    const Tag = ordered ? 'ol' : 'ul'
    return <Tag key={keyPrefix} className="public-article__list">
        {nodes.map((node, index) => {
            const key = `${keyPrefix}-${index}`
            const itemChildren = node.children.length ? renderList(buildListTree(node.children), `${key}-n`) : null
            return <li key={key}>
                <span>{renderInline(node.text, `${key}-t`)}</span>
                {itemChildren}
            </li>
        })}
    </Tag>
}

const isBlockStart = (line) => (
    HEADING.test(line)
    || FENCE.test(line)
    || THEMATIC_BREAK.test(line)
    || BLOCKQUOTE.test(line)
    || listItemPattern(line) !== null
)

const parseBlocks = (lines, keyPrefix = 'b') => {
    const blocks = []
    let index = 0

    while (index < lines.length) {
        const line = lines[index]
        if (!line.trim()) {
            index += 1
            continue
        }
        const key = `${keyPrefix}-${index}`

        const fence = line.match(FENCE)
        if (fence) {
            const closing = new RegExp(`^\\s*${fence[0].trim()[0]}{3,}\\s*$`)
            const body = []
            index += 1
            while (index < lines.length && !closing.test(lines[index])) {
                body.push(lines[index])
                index += 1
            }
            index += 1
            blocks.push(
                <pre key={key} className={`public-article__code${fence[1] ? ` language-${fence[1]}` : ''}`}>
                    <code>{body.join('\n')}</code>
                </pre>
            )
            continue
        }

        const heading = line.match(HEADING)
        if (heading) {
            const level = heading[1].length
            const Tag = `h${level}`
            blocks.push(<Tag key={key}>{renderInline(heading[2], `${key}-h`)}</Tag>)
            index += 1
            continue
        }

        if (THEMATIC_BREAK.test(line)) {
            blocks.push(<hr key={key} />)
            index += 1
            continue
        }

        if (BLOCKQUOTE.test(line)) {
            const quoted = []
            while (index < lines.length && BLOCKQUOTE.test(lines[index])) {
                quoted.push(lines[index].match(BLOCKQUOTE)[1])
                index += 1
            }
            blocks.push(
                <blockquote key={key} className="public-article__quote">
                    {parseBlocks(quoted, `${key}-q`)}
                </blockquote>
            )
            continue
        }

        if (listItemPattern(line)) {
            const items = []
            while (index < lines.length) {
                const item = listItemPattern(lines[index])
                if (item) {
                    items.push(item)
                    index += 1
                } else if (lines[index].trim() && !isBlockStart(lines[index]) && items.length) {
                    // Lazy continuation of the previous list item.
                    items[items.length - 1].text += ` ${lines[index].trim()}`
                    index += 1
                } else {
                    break
                }
            }
            blocks.push(renderList(buildListTree(items), key))
            continue
        }

        const paragraph = [line.trim()]
        index += 1
        while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
            paragraph.push(lines[index].trim())
            index += 1
        }
        blocks.push(<p key={key}>{renderInline(paragraph.join(' '), `${key}-p`)}</p>)
    }

    return blocks
}

/** Renders a Markdown string as React elements. Empty input renders nothing. */
export default function Markdown({ content }) {
    if (typeof content !== 'string' || !content.trim()) return null
    return <>{parseBlocks(content.replace(/\r\n?/g, '\n').split('\n'))}</>
}
