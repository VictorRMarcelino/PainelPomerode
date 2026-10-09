// CSV no padrão que o Excel em português abre direto: separador ";", vírgula decimal e BOM UTF-8.

export interface ColunaCsv<T> {
  titulo: string
  valor: (linha: T) => string | number
}

function celula(valor: string | number): string {
  if (typeof valor === 'number') return valor.toFixed(2).replace('.', ',')
  // Códigos longos (conta, fonte de recurso) virariam notação científica na planilha.
  if (/^\d{12,}$/.test(valor)) return `="${valor}"`
  return /[;"\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor
}

export function gerarCsv<T>(colunas: ColunaCsv<T>[], linhas: T[]): string {
  const cabecalho = colunas.map((c) => celula(c.titulo)).join(';')
  const corpo = linhas.map((linha) => colunas.map((c) => celula(c.valor(linha))).join(';'))
  return '﻿' + [cabecalho, ...corpo].join('\r\n') + '\r\n'
}

export function baixarCsv(nomeArquivo: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
