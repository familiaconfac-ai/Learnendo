# Modelo de progresso e pontuação

## Princípios

1. A interface confirma localmente antes de depender da rede.
2. Contadores são derivados de eventos/registros idempotentes, não incrementados cegamente.
3. Score de conclusão, acurácia e pontos são dimensões diferentes.
4. Uma modalidade não pode render mais apenas por ser mais rápida ou mais simples.
5. Falhas de persistência nunca resultam em tela vazia nem bloqueiam o próximo exercício.

## Identidade e hierarquia

A identidade canônica de uma conclusão é:

`w{workbookId}/{lessonId}/{dayId}/{exerciseId}`

Essa chave permite derivar, sem duplicidade:

`exercício → dia → lição → workbook → conteúdo publicado → curso planejado`

O estado local versionado armazena, por chave: tipo, tentativas, pontos, data e IDs de alvos de vocabulário. Os totais de dia, lição e workbook são calculados sobre o catálogo atualmente publicado; portanto, alterações planejadas não falsificam o percentual publicado.

## Denominadores

- publicado: soma real dos exercícios presentes nos workbooks publicados/carregados;
- planejado: 10.800 exercícios (9 × 1.200), nunca menor que o total publicado;
- implementação inicial de UI: Workbook 1 e sua lição atual;
- expansão: adicionar cada workbook ao catálogo publicado somente após validação editorial e técnica.

O modelo expõe percentuais publicado e planejado separadamente. Um aluno pode ter 100% do conteúdo publicado sem a aplicação afirmar que concluiu conteúdo ainda não publicado.

## Pontuação

| Evento | Pontos |
|---|---:|
| acerto na primeira tentativa | 10 |
| acerto após erro | 6 |
| repetição já concluída | 0 |

Não há multiplicador por modalidade. Pontos são concedidos uma única vez por chave canônica. A regra é pura, testável e pode ser reproduzida no servidor em uma futura sincronização.

## Métricas distintas

- `completionScore`: exercícios concluídos / exercícios previstos; alimenta a compatibilidade do dia e o diamante de 100%;
- `accuracy`: conclusões / tentativas; mede erros reais e não altera artificialmente conclusão;
- `points`: soma das recompensas idempotentes;
- `fire`, `ice`, `diamonds`, `stars`: derivados pelo `courseProgressEngine` a partir dos dias persistidos.

## Ordem transacional percebida

1. validar resposta;
2. registrar conclusão em memória;
3. tentar salvar cache local;
4. renderizar transição e próximo estado;
5. ao finalizar o dia, apresentar resumo;
6. atualizar navegação e progresso React/local;
7. disparar gravações remotas assíncronas;
8. reconciliar snapshots remotos sem apagar estado local mais recente.

## Migração remota recomendada

Criar documentos de evento determinísticos, por exemplo:

`users/{uid}/exerciseCompletions/{hash-da-chave-canônica}`

A criação deve ocorrer em transação ou com ID determinístico. O servidor aceita a primeira criação e trata as demais como replay. Agregados de dia e ranking devem ser reconstruíveis desses documentos. Durante a migração, dual-write deve ser monitorado antes da remoção dos caminhos weekly/flat.

## Compatibilidade e segurança

- cache inválido volta ao estado vazio;
- falha de `setItem` retorna `false`, sem exceção propagada;
- usuário anônimo usa namespace separado;
- índice inválido renderiza recuperação, nunca `null`;
- movimento reduzido elimina a espera da transição;
- conteúdo, IDs, respostas e normalizador global não são alterados por este modelo.
