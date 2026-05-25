# Console Logs - PPTX Import

## Como Visualizar os Logs

1. **Abrir DevTools**: `F12` ou `Ctrl+Shift+I`
2. **Aba Console**: Clique em "Console"
3. **Filtrar**: Digite `[PPTX Import]` na barra de filtro
4. **Expandir**: Clique nas linhas para ver detalhes

---

## Exemplo: Importar teste.pptx (Simples)

```javascript
[PPTX Import] Starting import of: teste.pptx
[PPTX Import] Slide canvas size: { width: 12192000, height: 6858000 }
[PPTX Import] Slide order (relationship IDs): ['rId2', 'rId3']
[PPTX Import] Presentation relationships: Map(2) { 'rId2' => 'slides/slide1.xml', 'rId3' => 'slides/slide2.xml' }
[PPTX Import] Available slide files: ['ppt/slides/slide1.xml', 'ppt/slides/slide2.xml']
[PPTX Import] Slide paths from relationships: ['ppt/slides/slide1.xml', 'ppt/slides/slide2.xml']
[PPTX Import] Final ordered slide paths: ['ppt/slides/slide1.xml', 'ppt/slides/slide2.xml']
[PPTX Import] Total slides detected: 2
[PPTX Import] Processing slide 1/2: ppt/slides/slide1.xml
[PPTX Import] Slide 1 - Found 0 blip references, 0 total images
[PPTX Import] Slide 1 - Found 2 shape elements
[PPTX Import] Slide 1 - Native elements: 1 text, 1 images, Image-only: false, Items in page: 2
[PPTX Import] Processing slide 2/2: ppt/slides/slide2.xml
[PPTX Import] Slide 2 - Found 0 blip references, 0 total images
[PPTX Import] Slide 2 - Found 1 shape element
[PPTX Import] Slide 2 - Native elements: 1 text, 0 images, Image-only: false, Items in page: 1
[PPTX Import] Import complete: 2 slides created

✅ Resultado esperado:
  - 2 slides no workspace
  - Slide 1: Text box + uma forma geométrica
  - Slide 2: Text box com conteúdo
```

---

## Exemplo: Importar Aula 8 - Apresentação.pptx (Complexo)

```javascript
[PPTX Import] Starting import of: Aula 8 - Apresentação.pptx
[PPTX Import] Slide canvas size: { width: 18288000, height: 10287000 }
[PPTX Import] Slide order (relationship IDs): ['rId6', 'rId7', 'rId8', 'rId9', 'rId10', 'rId11', 'rId12', 'rId13', 'rId14', 'rId15', 'rId16', 'rId17']
[PPTX Import] Presentation relationships: Map(13) { 
  'rId1' => 'slideMasters/slideMaster1.xml',
  'rId6' => 'slides/slide1.xml',
  'rId7' => 'slides/slide2.xml',
  'rId8' => 'slides/slide3.xml',
  'rId9' => 'slides/slide4.xml',
  'rId10' => 'slides/slide5.xml',
  'rId11' => 'slides/slide6.xml',
  'rId12' => 'slides/slide7.xml',
  'rId13' => 'slides/slide8.xml',
  'rId14' => 'slides/slide9.xml',
  'rId15' => 'slides/slide10.xml',
  'rId16' => 'slides/slide11.xml',
  'rId17' => 'slides/slide12.xml'
}
[PPTX Import] Available slide files: [
  'ppt/slides/slide1.xml', 'ppt/slides/slide2.xml', 'ppt/slides/slide3.xml',
  'ppt/slides/slide4.xml', 'ppt/slides/slide5.xml', 'ppt/slides/slide6.xml',
  'ppt/slides/slide7.xml', 'ppt/slides/slide8.xml', 'ppt/slides/slide9.xml',
  'ppt/slides/slide10.xml', 'ppt/slides/slide11.xml', 'ppt/slides/slide12.xml'
]
[PPTX Import] Slide paths from relationships: [
  'ppt/slides/slide1.xml', 'ppt/slides/slide2.xml', 'ppt/slides/slide3.xml',
  'ppt/slides/slide4.xml', 'ppt/slides/slide5.xml', 'ppt/slides/slide6.xml',
  'ppt/slides/slide7.xml', 'ppt/slides/slide8.xml', 'ppt/slides/slide9.xml',
  'ppt/slides/slide10.xml', 'ppt/slides/slide11.xml', 'ppt/slides/slide12.xml'
]
[PPTX Import] Final ordered slide paths: [
  'ppt/slides/slide1.xml', 'ppt/slides/slide2.xml', 'ppt/slides/slide3.xml',
  'ppt/slides/slide4.xml', 'ppt/slides/slide5.xml', 'ppt/slides/slide6.xml',
  'ppt/slides/slide7.xml', 'ppt/slides/slide8.xml', 'ppt/slides/slide9.xml',
  'ppt/slides/slide10.xml', 'ppt/slides/slide11.xml', 'ppt/slides/slide12.xml'
]
[PPTX Import] Total slides detected: 12
[PPTX Import] Processing slide 1/12: ppt/slides/slide1.xml
[PPTX Import] Slide 1 - Found 1 blip references, 1 total images
[PPTX Import] Slide 1 - Found 0 shape elements
[PPTX Import] Slide 1 - Uploading image 1: Aula 8 - Apresentação-1-1 (1650173 bytes, type: image/png)
[PPTX Import] Slide 1 - Native elements: 0 text, 1 images, Image-only: true, Items in page: 0
[PPTX Import] Processing slide 2/12: ppt/slides/slide2.xml
[PPTX Import] Slide 2 - Found 1 blip references, 1 total images
[PPTX Import] Slide 2 - Found 0 shape elements
[PPTX Import] Slide 2 - Uploading image 1: Aula 8 - Apresentação-2-1 (1520840 bytes, type: image/png)
[PPTX Import] Slide 2 - Native elements: 0 text, 1 images, Image-only: true, Items in page: 0
[PPTX Import] Processing slide 3/12: ppt/slides/slide3.xml
[PPTX Import] Slide 3 - Found 1 blip references, 1 total images
[PPTX Import] Slide 3 - Found 0 shape elements
[PPTX Import] Slide 3 - Uploading image 1: Aula 8 - Apresentação-3-1 (1738291 bytes, type: image/png)
[PPTX Import] Slide 3 - Native elements: 0 text, 1 images, Image-only: true, Items in page: 0
[PPTX Import] Processing slide 4/12: ppt/slides/slide4.xml
[PPTX Import] Slide 4 - Found 1 blip references, 1 total images
[PPTX Import] Slide 4 - Found 0 shape elements
[PPTX Import] Slide 4 - Uploading image 1: Aula 8 - Apresentação-4-1 (1642157 bytes, type: image/png)
[PPTX Import] Slide 4 - Native elements: 0 text, 1 images, Image-only: true, Items in page: 0
... [slides 5-12, similar pattern]
[PPTX Import] Processing slide 12/12: ppt/slides/slide12.xml
[PPTX Import] Slide 12 - Found 1 blip references, 1 total images
[PPTX Import] Slide 12 - Found 0 shape elements
[PPTX Import] Slide 12 - Uploading image 1: Aula 8 - Apresentação-12-1 (1456782 bytes, type: image/png)
[PPTX Import] Slide 12 - Native elements: 0 text, 1 images, Image-only: true, Items in page: 0
[PPTX Import] Import complete: 12 slides created

✅ Resultado esperado:
  - 12 slides no workspace
  - Cada slide com uma imagem grande (1.4-1.7 MB)
  - Todas as imagens carregadas do Firebase Storage
  - Nenhuma página em branco
```

---

## Cenários de Erro

### ❌ Arquivo não é PPTX válido
```javascript
[PPTX Import] Starting import of: documento.pdf
Uncaught (in promise) Error: Invalid PPTX structure: missing presentation files
```
**Solução**: Usar arquivo .pptx real, não PDF convertido

### ❌ Slide XML corrompido
```javascript
[PPTX Import] Processing slide 5/12: ppt/slides/slide5.xml
[PPTX Import] Warning: Could not load XML for slide ppt/slides/slide5.xml
[PPTX Import] Slide 5 - Found 0 blip references, 0 total images
[PPTX Import] Slide 5 - Found 0 shape elements
[PPTX Import] Slide 5 - Native elements: 0 text, 0 images, Image-only: false, Items in page: 0
```
**Resultado**: Slide 5 criado em branco, mas contagem mantida (não perdido!)
**Solução**: Reparar PPTX no PowerPoint e re-exportar

### ❌ Timeout de Upload
```javascript
[PPTX Import] Slide 3 - Uploading image 1: ... (18500000 bytes, type: image/png)
Error: Upload timeout after 30s
```
**Solução**: Aumentar tamanho de timeout em vite.config.ts ou reduzir tamanho de imagens

### ⚠️ Image path not resolved
```javascript
[PPTX Import] Slide 8 - Image rel ID rId5 not found in relationships
```
**Resultado**: Imagem ignorada, slide criado sem ela
**Solução**: Verificar integridade do PPTX

---

## Dicas para Troubleshooting

### 1. Copiar Logs Completos
```javascript
// No Console, execute:
copy(document.querySelector('.console-box').innerText);
// Agora colar em arquivo de texto para análise
```

### 2. Verificar Tamanho do Arquivo PPTX
```javascript
// No console do navegador:
document.querySelector('input[type="file"]').files[0].size;
// Tamanho em bytes (dividir por 1048576 para MB)
```

### 3. Monitorar Upload no DevTools
```
Network tab → Procure por:
- POST /liveClasses/{classId}/workspaceSlides/...
- Verificar status 200 OK
- Verificar tempo de resposta
```

---

## Checklist de Sucesso

Após importar Aula 8 - Apresentação.pptx:

- [ ] Console mostra: `[PPTX Import] Total slides detected: 12`
- [ ] Console mostra: `[PPTX Import] Import complete: 12 slides created`
- [ ] Workspace exibe 12 páginas (lado esquerdo)
- [ ] Cada página tem uma imagem (miniatura visível)
- [ ] Nenhuma página em branco
- [ ] Imagens carregam corretamente (sem erro 404)
- [ ] Sem erros vermelhos no console

**Se tudo acima ✓**: A correção está funcionando perfeitamente!
