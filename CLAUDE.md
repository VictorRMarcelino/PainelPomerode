# Painel Pomerode

Site web estático que consome a API de Dados Abertos de Contabilidade de Pomerode/SC e mostra receitas e despesas do município em gráficos, indicadores e tabelas fáceis de entender para o cidadão comum. Trabalho da disciplina de Gerência de Projetos (Sistemas de Informação).

Fonte de verdade do escopo: Termo de Abertura do Projeto v1.1 (26/09/2026). Não adicionar requisitos fora dele: o escopo é de no máximo 6 requisitos e mudanças só entram por Solicitação de Mudança aprovada pelo Patrocinador.

## Stack (obrigatória)

- Vue.js + TypeScript
- Tailwind CSS para estilo
- vue-chartjs para gráficos
- SweetAlert2 para mensagens de alerta e erro
- Site responsivo e estático, sem servidor próprio, publicado no GitHub Pages
- Custo zero: só ferramentas e serviços gratuitos

## Requisitos funcionais

| ID | Requisito | O que faz | Critério de aceitação |
|----|-----------|-----------|-----------------------|
| RF01 | Seleção do exercício | Usuário escolhe o ano; todas as telas são atualizadas com os dados desse ano | Ao trocar o ano, gráficos, indicadores e tabela mudam |
| RF02 | Despesas por secretaria | Gráfico com o total **pago** por secretaria/órgão no exercício | Soma do gráfico confere com o total pago do portal (±1%) |
| RF03 | Receita x despesa mensal | Gráfico comparando, mês a mês, receita arrecadada e despesa paga | 12 meses exibidos (ou até o mês atual) |
| RF04 | Indicadores | Cartões com: a) % do orçamento executado; b) % gasto em Saúde e em Educação; c) despesa por habitante | Valores calculados conforme regra documentada |
| RF05 | Maiores credores | Tabela dos fornecedores/credores que mais receberam, com busca por nome e filtro por secretaria | Filtro e ordenação funcionando |
| RF06 | Exportação | Botão de download em CSV dos dados exibidos na tela | Arquivo abre corretamente em planilha |

São exigidos só **2 gráficos** (RF02 e RF03). Despesa por habitante usa a última estimativa oficial de população do IBGE.

## Requisitos não funcionais

- Dados consultados diretamente da API oficial, com indicação da fonte e da data da consulta.
- Indicador de carregamento durante as consultas e mensagem amigável (SweetAlert2) se a API falhar.
- Carregar os dados de um exercício completo em até **15 segundos**, com indicador de carregamento.
- Totais de receita e despesa paga de um exercício com divergência máxima de **1%** em relação ao portal oficial.

## API de Dados Abertos

Base URL: `https://pomerode.atende.net/api/WCPDadosAbertos/` (pública, somente leitura, sem autenticação, JSON UTF-8; enviar `Accept: application/json`).

| Endpoint | Parâmetros (DD/MM/AAAA) |
|----------|-------------------------|
| `despesas` | `dataInicial`, `dataFinal` |
| `despesaRestos` | `dataFinal` |
| `despesasOrcadas` | `dataFinal` |
| `receitas` | `dataInicial`, `dataFinal` |
| `receitasOrcadas` | `dataFinal` |

Limitações que definem a arquitetura:

- `dataInicial` e `dataFinal` precisam estar **dentro do mesmo exercício**. Nunca consultar períodos que cruzem anos.
- A API devolve **totais do período**, sem separação por mês. Para o RF03, fazer uma chamada por mês (12 chamadas, ou até o mês atual) e consolidar no front-end.
- A API é lenta (cerca de 10 s e 2 MB por exercício). Usar cache no navegador (localStorage/sessionStorage), consultas por períodos menores e loading em toda requisição.
- A API pode ficar fora do ar: manter cópia local dos dados para contingência na demonstração.

Formato observado nos arquivos de exemplo (`API/JSON/`), que difere da especificação em PDF:

- Resposta no formato `{ "status": ..., "retorno": [ ... ] }`.
- Valores numéricos vêm como **string** (ex.: `"valorPago": "816.74"`): converter com `Number()` antes de somar.
- Descrições podem ter espaço no início (ex.: `" Câmara Municipal"`): aplicar `trim()`.
- Despesas trazem `orgaoDescricao`, `unidadeDescricao`, `nomeCredor`, `cpfCnpjCredor`, `valorEmpenhado`, `valorLiquidado`, `valorPago`. Para RF02, RF03 e RF05 usar **`valorPago`** (não empenhado).
- Receitas trazem `contaCodigo`, `contaDescricao`, `valorArrecadado`; orçados trazem `valorOrcado`.

Atenção à interpretação contábil (secretaria x função, pago x empenhado): documentar as regras de cálculo e mostrar notas explicativas no painel.

## Responsabilidades

Miguel é responsável pelo **seletor de ano (RF01)** e pelos **dois gráficos (RF02 e RF03)**. RF04, RF05 e RF06 ficam com outros integrantes da equipe. Ao trabalhar neste repositório a pedido do Miguel, priorizar esses três itens e não alterar componentes dos outros sem combinar.

## até o momento é pra fazer apenas isso:
- Fazer o seletor de exercício (RF01)
- Começar os gráficos e os cartões com dados de teste, no formato combinado conforme a documentação do Gabriel. que está no documento "Especificação da API de Dados"


## Prazos

- 12/10/2026: integração com a API concluída e dados validados
- 15/10/2026: conferência dos valores com o portal oficial (±1%)
- 21/10/2026: painel com os 6 requisitos concluído e testado
- 22/10/2026: site publicado no GitHub Pages, entrega e apresentação final (cada dia de atraso tira 1,0 ponto)
