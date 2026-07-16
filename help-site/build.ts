/**
 * Build the public help site.
 *
 * Reads the app's existing configuration (the single source of truth) and
 * generates a static HTML reference of every spreadsheet and column, grouped
 * the same way fields appear in the app's edit form. The generated reference
 * is injected into help-site/template.html and written, along with the
 * stylesheet, to help-site/out/.
 *
 * Run with: npm run help:build
 */
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getEntityFieldModel } from '../src/types/types'
import type { ItemDataType } from '../src/types/types'
import { dataTypeLabels } from '../src/config/datatype-labels'
import { groupRenderedFields } from '../src/config/field-groups'
import {
  getFieldDisplayLabel,
  getFieldDescription,
} from '../src/config/field-labels'
import {
  getControlledVocabularyForField,
  isMultiSelectField,
  type ControlledVocabularySource,
} from '../src/config/field-vocabularies'
import { buildContributions } from './contributions'
import { buildDownload } from './download'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HELP_DIR = __dirname
const OUT_DIR = join(HELP_DIR, 'out')
const FONTS_SRC_DIR = join(HELP_DIR, '..', 'src', 'fonts')
const FAVICON_SRC = join(HELP_DIR, 'assets', 'images', 'favicon.ico')
const PLACEHOLDER = '<!--FIELD_REFERENCE-->'

// Brand fonts copied into the output so the public site matches the app.
// Paths are relative to src/fonts and preserved under out/fonts.
const FONT_FILES = [
  'meloso/MelosoVariable-Regular.ttf',
  'muli/Muli.ttf',
  'muli/Muli-Italic.ttf',
  'muli/Muli-Light.ttf',
  'muli/Muli-SemiBold.ttf',
  'muli/Muli-Bold.ttf',
]

// Entity types shown in the main reference, in reading order.
const MAIN_ENTITY_ORDER: ItemDataType[] = [
  'RepositoryObject',
  'Person',
  'Organization',
  'Place',
  'Language',
  'ldac:DataReuseLicense',
  'Tag',
  'RepositoryCollection',
  'Dataset',
]

// Shown under a separate "Advanced / system sheets" heading.
const ADVANCED_ENTITY_ORDER: ItemDataType[] = ['File']

// Maps a controlled-vocabulary source to the human name of the sheet it links to.
const VOCAB_SHEET_LABEL: Record<ControlledVocabularySource, string> = {
  People: dataTypeLabels.Person.label,
  Languages: dataTypeLabels.Language.label,
  Places: dataTypeLabels.Place.label,
  Localities: dataTypeLabels.Geometry.label,
  Licenses: dataTypeLabels['ldac:DataReuseLicense'].label,
  RepositoryCollection: dataTypeLabels.RepositoryCollection.label,
  Tags: dataTypeLabels.Tag.label,
  Organization: dataTypeLabels.Organization.label,
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderField(fieldName: string): string {
  const label = escapeHtml(getFieldDisplayLabel(fieldName))
  const description = getFieldDescription(fieldName)
  const vocab = getControlledVocabularyForField(fieldName)
  const isMulti = isMultiSelectField(fieldName)

  const badges: string[] = []
  if (vocab) {
    const sheet = VOCAB_SHEET_LABEL[vocab] ?? vocab
    badges.push(
      `<span class="badge badge-ref">Links to ${escapeHtml(sheet)}</span>`,
    )
  }
  if (isMulti) {
    badges.push('<span class="badge badge-multi">Multiple values</span>')
  }

  const descHtml = description
    ? `<p class="field-desc">${escapeHtml(description)}</p>`
    : `<p class="field-desc empty">No description yet.</p>`

  const badgesHtml = badges.length
    ? `<div class="badges">${badges.join('')}</div>`
    : ''

  return [
    '        <div class="field">',
    '          <div class="field-head">',
    `            <span class="field-label">${label}</span>`,
    `            <code class="field-column">${escapeHtml(fieldName)}</code>`,
    '          </div>',
    `          ${descHtml}`,
    badgesHtml ? `          ${badgesHtml}` : '',
    '        </div>',
  ]
    .filter(Boolean)
    .join('\n')
}

function renderGroup(title: string, fields: string[]): string {
  const fieldsHtml = fields.map(renderField).join('\n')
  return [
    '      <div class="field-group">',
    `        <h4 class="field-group-title">${escapeHtml(title)}</h4>`,
    fieldsHtml,
    '      </div>',
  ].join('\n')
}

function renderEntity(type: ItemDataType, open: boolean): string {
  const meta = dataTypeLabels[type]
  const fields = getEntityFieldModel(type)

  const grouped = groupRenderedFields(fields)
  const claimed = new Set(grouped.flatMap((g) => g.fields))
  const leftovers = fields.filter((f) => !claimed.has(f))

  const groupsHtml = grouped
    .map((g) => renderGroup(g.def.label, g.fields))
    .join('\n')

  const leftoversHtml = leftovers.length
    ? renderGroup('Other fields', leftovers)
    : ''

  return [
    `    <details class="entity"${open ? ' open' : ''}>`,
    '      <summary>',
    `        <span class="entity-icon">${escapeHtml(meta.icon)}</span>`,
    `        <span>${escapeHtml(meta.label)}</span>`,
    '      </summary>',
    '      <div class="entity-body">',
    groupsHtml,
    leftoversHtml,
    '      </div>',
    '    </details>',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildReference(): string {
  const parts: string[] = []

  parts.push('      <section class="reference">')
  parts.push('        <h2>Sheets and columns</h2>')
  MAIN_ENTITY_ORDER.forEach((type, index) => {
    parts.push(renderEntity(type, index === 0))
  })
  parts.push('      </section>')

  if (ADVANCED_ENTITY_ORDER.length) {
    parts.push('      <section class="reference advanced">')
    parts.push(
      '        <h3 class="advanced-heading">Advanced / system sheets</h3>',
    )
    parts.push(
      '        <p class="advanced-lead">These sheets are mostly managed by the app. Most people never edit them by hand.</p>',
    )
    ADVANCED_ENTITY_ORDER.forEach((type) => {
      parts.push(renderEntity(type, false))
    })
    parts.push('      </section>')
  }

  return parts.join('\n')
}

async function main(): Promise<void> {
  const templatePath = join(HELP_DIR, 'template.html')
  const stylesPath = join(HELP_DIR, 'styles.css')

  const template = readFileSync(templatePath, 'utf8')
  if (!template.includes(PLACEHOLDER)) {
    throw new Error(
      `template.html is missing the ${PLACEHOLDER} placeholder — cannot inject the field reference.`,
    )
  }

  const html = template.replace(PLACEHOLDER, buildReference())

  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, 'index.html'), html, 'utf8')
  copyFileSync(stylesPath, join(OUT_DIR, 'styles.css'))
  copyFileSync(FAVICON_SRC, join(OUT_DIR, 'favicon.ico'))

  for (const relPath of FONT_FILES) {
    const dest = join(OUT_DIR, 'fonts', relPath)
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(join(FONTS_SRC_DIR, relPath), dest)
  }

  const count = [...MAIN_ENTITY_ORDER, ...ADVANCED_ENTITY_ORDER].length
  console.log(
    `Help site built: ${count} sheets -> ${join(OUT_DIR, 'index.html')}`,
  )

  await buildContributions(OUT_DIR, HELP_DIR)
  buildDownload(OUT_DIR, HELP_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
