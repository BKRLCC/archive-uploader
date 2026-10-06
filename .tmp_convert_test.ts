import * as XLSX from 'xlsx'
import { buildWorkbook } from './src/helpers/workbook-builder'
import { deriveFileRowsFromItems } from './src/helpers/file-linkage'
import { TypeColumns } from './src/types/types'

async function main() {
  const wb = buildWorkbook('RepositoryObject', { name: 'Test Collection', description: 'd' })

  // Find the generated items sheet (not RootDataset/@context/Files) and overwrite
  // it with a single RepositoryObject that owns one non-image file.
  const itemsName = wb.SheetNames.find(n => !['RootDataset','@context','Files'].includes(n))!
  const itemHeaders = ['@id','@type','name','isRef_hasPart','isRef_pcdm:memberOf']
  const itemRow = ['#obj1','RepositoryObject','Object One','Data/clip.mov','./']
  wb.Sheets[itemsName] = XLSX.utils.aoa_to_sheet([itemHeaders, itemRow])

  // Build the Files sheet with the new encodingFormat/name columns.
  const fileHeaders = [...TypeColumns.File] as string[]
  const derived = deriveFileRowsFromItems([{ itemId: '#obj1', hasPart: 'Data/clip.mov' }])
  const fileRows = derived.map(r => fileHeaders.map(h => String((r as Record<string,string>)[h] ?? '')))
  wb.Sheets['Files'] = XLSX.utils.aoa_to_sheet([fileHeaders, ...fileRows])

  console.log('Files sheet headers sent:', JSON.stringify(fileHeaders))
  console.log('Files row sent:', JSON.stringify(fileRows[0]))

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const form = new FormData()
  form.append('file', new Blob([buf]), 'ro-crate-metadata.xlsx')

  const res = await fetch('https://ro-crate-excel-api.light.garden/convert?report=1', { method: 'POST', body: form })
  console.log('HTTP', res.status)
  if (!res.ok) { console.log('body:', (await res.text()).slice(0,500)); return }
  const { crate } = await res.json() as { crate: { '@graph': Array<Record<string, unknown>> } }
  const fileNodes = crate['@graph'].filter(n => {
    const t = n['@type']; return t === 'File' || (Array.isArray(t) && t.includes('File'))
  })
  console.log('File node count:', fileNodes.length)
  for (const fn of fileNodes) console.log('File node:', JSON.stringify(fn))
}
main().catch(e => { console.error('ERR', e); process.exit(1) })
