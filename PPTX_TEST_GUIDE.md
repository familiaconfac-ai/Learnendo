# 🧪 PPTX Import - Guia de Testes

## Preparação

### 1. Verificar Estado do Build
```bash
cd c:\Users\conta\Learnendo\apps\main

# Verificar sem erros
npm run lint
# Esperado: ✓ 0 errors

# Build completo
npm run build
# Esperado: ✓ built in ~21.57s
```

### 2. Ter Arquivo PPTX de Teste
- ✅ `c:\Users\conta\Learnendo\tmp\pptx-inspect\Aula 8 - Apresentação.pptx` (12 slides, 1.6MB imagens)
- ✅ Verificação offline: `node c:\Users\conta\Learnendo\tmp\analyze-pptx.js`

---

## Teste 1: Importação Simples (teste.pptx)

### Pré-requisito
Criar um PPTX simples se não existir:
1. Abrir PowerPoint
2. Criar apresentação com 2 slides
3. Slide 1: Adicionar texto + uma forma retângulo
4. Slide 2: Adicionar apenas texto
5. Salvar como `teste.pptx` em `c:\Users\conta\Learnendo\tmp\`

### Procedimento
```bash
# 1. Iniciar dev server
cd c:\Users\conta\Learnendo\apps\main
npm run dev
# Aguardar: "VITE v6.4.1 ready in 1234 ms"

# 2. Abrir navegador em http://localhost:3000
# 3. Fazer login / criar conta
# 4. Criar uma aula (LiveClass)
# 5. Abrir Workspace
# 6. Slides → Import Slides → Selecionar teste.pptx
```

### Checklist de Sucesso
- [ ] F12 → Console → Filtrar `[PPTX Import]`
- [ ] Log mostra: `Starting import of: teste.pptx`
- [ ] Log mostra: `Total slides detected: 2`
- [ ] Log mostra: `Import complete: 2 slides created`
- [ ] Workspace exibe 2 páginas no painel esquerdo
- [ ] Slide 1 exibe: texto + forma retângulo
- [ ] Slide 2 exibe: texto
- [ ] Sem erros vermelhos no console

---

## Teste 2: Importação Complexa (Aula 8)

### Procedimento
```bash
# Mesmo servidor do Teste 1 (npm run dev já rodando)

# 1. Abrir arquivo em c:\Users\conta\Learnendo\tmp\pptx-inspect\
#    → "Aula 8 - Apresentação.pptx" (12 slides, 1.6MB images)
# 2. Em novo Workspace (ou limpar slides existentes)
# 3. Slides → Import Slides → Selecionar arquivo
# 4. Aguardar até o import terminar
```

### Checklist de Sucesso
- [ ] F12 → Console → Filtrar `[PPTX Import]`
- [ ] Log mostra: `Starting import of: Aula 8 - Apresentação.pptx`
- [ ] Log mostra: `Total slides detected: 12`
- [ ] Log mostra 12x: `Processing slide N/12:`
- [ ] Log mostra 12x: `Uploading image 1:` (com tamanho em bytes)
- [ ] Log mostra 12x: `Image-only: true` (porque slides são imagens)
- [ ] Log mostra: `Import complete: 12 slides created`
- [ ] Workspace exibe **exatamente 12 páginas** (não mais, não menos)
- [ ] Cada página tem thumbnail com imagem
- [ ] Todas as imagens carregam (não mostram "broken image")
- [ ] Sem erros vermelhos no console
- [ ] Sem warnings de 404 para imagens

### Se Falhar...

#### ❌ "Total slides detected: X" (X ≠ 12)
```javascript
// No console:
// Procure por: "Slide order (relationship IDs)"
// Contar os rIds: devem ser 12
// Se < 12: arquivo corrompido
// Se > 12: múltiplos slides mapeados errado
```

#### ❌ "Import complete: X slides created" (X ≠ 12)
```javascript
// Significa que Y slides não foram processados
// Procure por: "Warning: Could not load XML"
// Se houver: verificar integridade do PPTX
// Se não houver: bug no código (reportar issue)
```

#### ❌ Imagens não carregam (404 Not Found)
```
Network tab → Procure por:
POST /liveClasses/.../workspaceSlides/...
↓
Response: 403 Forbidden ou 404 Not Found
↓
Problema: Firebase Storage permissions
Solução: Verificar firestore.rules
```

#### ❌ Slide em branco
```javascript
// No console, procure pelo número do slide
// [PPTX Import] Slide 5 - Found X blip references
// [PPTX Import] Slide 5 - Native elements: ...
// Se "Found 0" e "Native elements: 0": slide está vazio
// Verificar: arquivo original tem conteúdo nesse slide?
```

---

## Teste 3: Testes de Stress (Opcional)

### Arquivo de Teste Grande
```bash
# Criar PPTX com 50 slides:
# 1. PowerPoint → Duplicate slide múltiplas vezes
# 2. Cada slide deve ter uma imagem (resoluções variadas)
# 3. Salvar como "test-50-slides.pptx"
```

### Procedimento
```bash
# Mesmo server (npm run dev)
# Import do arquivo 50-slides
# Monitorar:
# - Tempo total (log de início e fim)
# - Memory usage (DevTools → Memory tab)
# - Network requests (DevTools → Network tab)
```

### Métricas Esperadas
- Tempo: ~5-10 minutos (50 imagens upload)
- Memory: <500MB (sem memory leaks)
- Network: ~150-200 requests (1 por slide + uploads)

---

## Teste 4: Testes de Erro (Opcional)

### Arquivo Inválido
```bash
# 1. Criar arquivo vazio chamado "empty.pptx"
# 2. Import no Workspace
# Esperado: Erro claro "Invalid PPTX structure"
```

### Arquivo Corrompido
```bash
# 1. Renomear um .zip para .pptx
# 2. Import no Workspace
# Esperado: Erro claro (não crash)
```

### Conectividade Perdida
```bash
# 1. Desativar WiFi antes de iniciar import
# 2. Esperado: Erro no upload da imagem
# Esperado: Log "Connection failed"
```

---

## Rollback (Se Necessário)

Se a solução não funcionar como esperado:

```bash
# 1. Checkout versão anterior
git checkout HEAD~1 -- apps/main/src/components/LiveClasses/Workspace/WorkspaceCanvas.tsx

# 2. Rebuild
cd apps/main
npm run lint
npm run build

# 3. Reiniciar server
npm run dev
```

---

## Relatório de Testes

### Template para Documentar Resultados

```markdown
## Relatório de Teste PPTX Import

**Data**: 2024-05-XX  
**Ambiente**: Windows, Node.js vXX.XX, npm vXX.XX  
**Navegador**: Chrome/Firefox/Edge vXX  

### Teste 1: teste.pptx ✅/❌
- Slides detectados: 2/2
- Conteúdo exibido: [descrever]
- Erros console: [nenhum/descrever]

### Teste 2: Aula 8 - Apresentação.pptx ✅/❌
- Slides detectados: 12/12
- Imagens carregadas: 12/12
- Tempo total: XXs
- Erros console: [nenhum/descrever]

### Teste 3: Stress (50 slides) ✅/❌/⏭️
- [Opcional] Resultado: ...

### Teste 4: Erros ✅/❌/⏭️
- [Opcional] Comportamento: ...

### Conclusão
✅ Todos os testes passaram - Pronto para produção!
❌ Alguns testes falharam - Reportar issue com logs acima
```

---

## Próximas Etapas Após Testes

### ✅ Se Tudo Funcionar:
1. Commit das mudanças:
```bash
git add apps/main/src/components/LiveClasses/Workspace/WorkspaceCanvas.tsx
git commit -m "fix(pptx): improve import reliability with diagnostics"
git push origin main
```

2. Deploy para staging/produção:
```bash
npm run deploy  # Se usando Vercel
```

3. Comunicar ao time:
- Arquivo: PPTX_FIX_ENTREGA_FINAL.md
- Status: 🟢 RESOLVIDO

### ❌ Se Houver Problemas:
1. Abrir issue no GitHub com:
   - Logs completos (PPTX_IMPORT_CONSOLE_LOGS.md)
   - Arquivo PPTX que falha (ou exemplo similar)
   - Sistema operacional e versões (node, npm, navegador)

2. Contatar suporte ou revisar código:
   - Arquivo: PPTX_IMPORT_FIX_REPORT.md
   - Seção: "Known Limitations"

---

## Dúvidas Comuns

**P: Quanto tempo leva o import?**
R: ~5s para 2 slides, ~5 minutos para 12 slides (depende conexão)

**P: Posso importar ao mesmo tempo que edito?**
R: Não recomendado - import usa muitos recursos de network/upload

**P: Os logs vão ficar na produção?**
R: Sim, mas apenas no console (DevTools F12) - usuário final não vê

**P: Que outros tipos de arquivo são suportados?**
R: Imagens (PNG/JPG) e PPTX. Não suporta ODP, KEY, PPT legado.

---

## Checklist Final

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → success
- [ ] Teste 1 (simples) → pass
- [ ] Teste 2 (complexo 12 slides) → pass
- [ ] Teste 3 (stress opcional) → pass ou skip
- [ ] Teste 4 (erros opcional) → pass ou skip
- [ ] Documentação criada e clara
- [ ] Logs esperados conforme PPTX_IMPORT_CONSOLE_LOGS.md

🟢 **PRONTO PARA ENTREGA!**
