import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  NotParseableError,
  CkanHttpError,
  CkanApiError,
  fetchAndParseFile,
} from '../ckan.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Error classes', () => {
  it('NotParseableError sets format and url', () => {
    const err = new NotParseableError('XLS', 'https://example.com/file.xls')
    expect(err.format).toBe('XLS')
    expect(err.url).toBe('https://example.com/file.xls')
    expect(err.name).toBe('NotParseableError')
    expect(err).toBeInstanceOf(Error)
  })

  it('CkanHttpError sets statusCode and statusText', () => {
    const err = new CkanHttpError(404, 'Not Found')
    expect(err.statusCode).toBe(404)
    expect(err.statusText).toBe('Not Found')
    expect(err.name).toBe('CkanHttpError')
  })

  it('CkanApiError sets errorType', () => {
    const err = new CkanApiError('something failed', 'Validation Error')
    expect(err.errorType).toBe('Validation Error')
    expect(err.name).toBe('CkanApiError')
  })
})

describe('fetchAndParseFile', () => {
  it('throws NotParseableError for XLS format', async () => {
    await expect(fetchAndParseFile('https://x.com/f.xls', 'XLS', 10, 0))
      .rejects.toBeInstanceOf(NotParseableError)
  })

  it('throws NotParseableError for PDF format', async () => {
    await expect(fetchAndParseFile('https://x.com/f.pdf', 'PDF', 10, 0))
      .rejects.toBeInstanceOf(NotParseableError)
  })

  it('parses CSV and returns correct fields and records', async () => {
    const csvContent = 'Region,Provincia,Comuna\nCOQUIMBO,ELQUI,LA SERENA\nATACAMA,COPIAPO,COPIAPO\n'
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(csvContent, {
        status: 200,
        headers: { 'content-type': 'text/csv; charset=utf-8' },
      })
    )

    const result = await fetchAndParseFile('https://x.com/data.csv', 'CSV', 10, 0)
    expect(result.fields).toEqual([
      { id: 'Region', type: 'text' },
      { id: 'Provincia', type: 'text' },
      { id: 'Comuna', type: 'text' },
    ])
    expect(result.records).toHaveLength(2)
    expect(result.records[0]).toEqual({ Region: 'COQUIMBO', Provincia: 'ELQUI', Comuna: 'LA SERENA' })
    expect(result.total).toBe(2)
    expect(result.source).toBe('file')
  })

  it('respects limit and offset', async () => {
    const lines = ['A,B', '1,2', '3,4', '5,6', '7,8'].join('\n')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(lines, { status: 200, headers: { 'content-type': 'text/csv' } })
    )

    const result = await fetchAndParseFile('https://x.com/data.csv', 'CSV', 2, 1)
    expect(result.records).toHaveLength(2)
    expect(result.records[0]).toEqual({ A: '3', B: '4' })
    expect(result.total).toBe(4)
  })

  it('parses TSV and splits on tab', async () => {
    const tsv = 'A\tB\n1\t2\n3\t4\n'
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(tsv, { status: 200, headers: { 'content-type': 'text/tab-separated-values' } })
    )
    const result = await fetchAndParseFile('https://x.com/data.tsv', 'TSV', 10, 0)
    expect(result.records[0]).toEqual({ A: '1', B: '2' })
    expect(result.total).toBe(2)
    expect(result.source).toBe('file')
  })

  it('parses JSON array and returns records', async () => {
    const json = JSON.stringify([{ name: 'Chile', code: 'CL' }, { name: 'Peru', code: 'PE' }])
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(json, { status: 200, headers: { 'content-type': 'application/json' } })
    )
    const result = await fetchAndParseFile('https://x.com/data.json', 'JSON', 10, 0)
    expect(result.total).toBe(2)
    expect(result.records[0]).toEqual({ name: 'Chile', code: 'CL' })
    expect(result.fields).toEqual([{ id: 'name', type: 'text' }, { id: 'code', type: 'text' }])
    expect(result.source).toBe('file')
  })

  it('returns empty result for empty CSV body', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('\n\n  \n', { status: 200, headers: { 'content-type': 'text/csv' } })
    )
    const result = await fetchAndParseFile('https://x.com/empty.csv', 'CSV', 10, 0)
    expect(result.fields).toEqual([])
    expect(result.records).toEqual([])
    expect(result.total).toBe(0)
  })

  it('throws CkanHttpError with correct status on non-ok response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404, statusText: 'Not Found' })
    )
    const err = await fetchAndParseFile('https://x.com/data.csv', 'CSV', 10, 0).catch(e => e)
    expect(err).toBeInstanceOf(CkanHttpError)
    expect(err.statusCode).toBe(404)
    expect(err.statusText).toBe('Not Found')
  })
})
