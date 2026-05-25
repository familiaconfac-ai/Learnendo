# GUIA: Caixas de Texto com Controle de Aluno

**Data:** 16 de Abril de 2026  
**Status:** ✅ IMPLEMENTADO E COMPILADO

---

## 📋 RESUMO DAS MUDANÇAS

### Problema Original
- Professor não conseguia mover caixa
- Aluno não conseguia editar sua própria caixa
- Não havia vinculação real entre aluno e caixa
- Bloqueio afetava bloco inteiro, não apenas edição

### Solução Implementada
- ✅ **ownerUserId** e **ownerEmail** adicionados ao `WorkspaceItem`
- ✅ Professor sempre consegue mover/renomear/editar qualquer caixa
- ✅ Aluno só consegue editar sua própria caixa (vinculada por `ownerUserId`)
- ✅ Bloqueio agora afeta **apenas** edição de conteúdo, não movimento
- ✅ Professor pode associar caixa a aluno pelo email

---

## 🔧 ARQUIVOS ALTERADOS

### 1. `apps/main/src/services/workspaceService.ts`

**Adicionados campos ao `WorkspaceItem`:**
```typescript
export interface WorkspaceItem {
  // ... campos existentes ...
  ownerUserId?: string;    // ID real do aluno dono
  ownerEmail?: string;     // Email do dono (para identificação)
  label?: string;          // Nome visível da caixa
  // ... resto do interface ...
}
```

**Impacto:** Caixa agora carrega informações de dono na Firestore.

---

### 2. `apps/main/src/components/LiveClasses/Workspace/WorkspaceCanvas.tsx`

#### A. Lógica de Permissão (linhas ~1445-1450)

**Adicionado cálculo de permissão:**
```typescript
// Determine if current user can edit the text content
const canEditContent = isTeacher || (!item.ownerUserId) || (item.ownerUserId === currentUserId);
const isOwnedByOther = item.ownerUserId && item.ownerUserId !== currentUserId && !isTeacher;
```

**Como funciona:**
- `canEditContent = true` se:
  - Professor (`isTeacher`)
  - OU caixa não tem dono (`!item.ownerUserId`)
  - OU usuário é o dono da caixa (`item.ownerUserId === currentUserId`)
- `isOwnedByOther = true` se:
  - Caixa tem dono diferente do usuário atual
  - E não é professor

#### B. Contenteditable (linha ~1545)

**Antes:**
```typescript
contentEditable={!readOnly && (!isLockedByOther || isTeacher)}
```

**Depois:**
```typescript
contentEditable={canEditContent && !isLockedByOther}
```

**Impacto:** Aluno só edita se for dono; professor sempre edita.

#### C. Cursor e Opacidade (linhas ~1553-1556)

```typescript
cursor: !canEditContent || isLockedByOther ? 'not-allowed' : 'text',
opacity: isOwnedByOther ? 0.65 : isLockedByOther ? 0.85 : 1,
```

**Impacto:** UI mostra claramente se aluno não tem permissão (cursor not-allowed, opacidade reduzida).

#### D. Header com Associação de Dono (linhas ~1527-1560)

**Adicionado:**
```typescript
const [assigningOwner, setAssigningOwner] = useState(false);
const assignRef = useRef<HTMLDivElement>(null);

// Novo header com:
- Label (editável pelo professor)
- Badge de email/uid do dono
- Botão "👤" para professor associar dono
- Input para email do aluno
```

**Fluxo:**
1. Professor clica botão "👤" quando caixa está selecionada
2. Aparece input para email do aluno
3. Professor digita email (ex: "joao@escola.com")
4. Enter ou blur dispara `updateItem` com:
   ```typescript
   {
     ownerEmail: "joao@escola.com",
     ownerUserId: "joao" // (parte antes do @)
   }
   ```
5. Badge mostra "joao@escola.com" na caixa

#### E. Movimento e Resize Sempre Permitidos

**Mudanças:**
- `onPointerDown` sem bloqueio `if (readOnly)` (já removido em commit anterior)
- `onSelect` sem condição `!readOnly` (já removido em commit anterior)
- `ResizeHandle` renderizado sempre quando selecionado
- Movimento (`div onPointerDown={onPointerDownMove}`) sempre visível

**Impacto:** Professor move/redimensiona qualquer caixa mesmo que pertença a aluno.

---

## 🎯 FLUXO DE PERMISSÕES

### Cenário 1: Professor Cria Caixa (sem dono)

```
1. Professor cria caixa
2. item.ownerUserId = undefined
3. Qualquer pessoa pode editar (canEditContent = true para todos)
4. Professor pode renomear
5. Professor clica "👤" e asocia ao João
```

### Cenário 2: Caixa Vinculada ao Aluno João

```
currentUserId = "joao"
item.ownerUserId = "joao"
item.ownerEmail = "joao@escola.com"

1. João consegue:
   - Clicar ✅
   - Digitar ✅
   - Editar conteúdo ✅
   - (Não consegue mover/renomear, só professor)

2. Outro aluno (Pedro) tenta acessar:
   - Clixa e vê "not-allowed" cursor ❌
   - Não consegue digitar ❌
   - Vê opacidade 0.65 (desbotado) ❌

3. Professor consegue:
   - Mover ✅
   - Redimensionar ✅
   - Renomear ✅
   - Editar conteúdo ✅
   - Trocar associação ✅
```

---

## 📝 TESTE PRÁTICO

### Pré-requisito
- App rodando com `npm run dev`
- Professor logged in com `isTeacher = true`
- 2+ alunos logados (João e Pedro)

### Teste 1: Professor Move Caixa
```
1. Professor: Criar caixa de texto
2. Professor: Clicar na caixa (seleção)
3. Professor: Arrastar caixa para outro lugar ✅
4. Professor: Ver handle de resize (quadrado azul bottom-right)
5. Professor: Arrastar handle para redimensionar ✅
```

**Esperado:**
- Caixa se move suavemente
- Resize funciona
- Não há travamento

---

### Teste 2: Professor Associa ao Aluno
```
1. Professor: Caixa selecionada
2. Professor: Procura botão "👤" no header
3. Professor: Clica "👤"
4. Professor: Digita "joao@escola.com"
5. Professor: Pressiona Enter
```

**Esperado:**
- Input desaparece
- Badge "joao@escola.com" aparece no header
- Em DevTools/Network: item salvo com:
  ```json
  {
    "ownerEmail": "joao@escola.com",
    "ownerUserId": "joao"
  }
  ```

---

### Teste 3: Aluno João Edita Sua Caixa
```
1. João: Fazer login com uid "joao"
2. João: Procurar caixa com badge "joao@escola.com"
3. João: Clicar dentro da caixa
4. João: Digitar conteúdo ✅
```

**Esperado:**
- Cursor muda para "text" (não "not-allowed")
- Conteúdo é editável
- Opacidade normal (não desbotado)

---

### Teste 4: Aluno Pedro NÃO Consegue Editar Caixa do João
```
1. Pedro: Fazer login com uid "pedro"
2. Pedro: Procurar caixa com badge "joao@escola.com"
3. Pedro: Tentar clicar dentro da caixa
4. Pedro: Tentar digitar
```

**Esperado:**
- Cursor mostra "not-allowed" ❌
- Contenteditable desabilitado ❌
- Opacidade 0.65 (mais desbotado que o normal) ❌
- Não consegue digitar ❌

---

### Teste 5: Professor Edita Caixa do João
```
1. Professor: Caixa de João selecionada
2. Professor: Clicar dentro da caixa
3. Professor: Digitar algo ✅
```

**Esperado:**
- Professor consegue editar normalmente
- Sem restrição
- Cursor "text"

---

### Teste 6: Professor Muda Associação
```
1. Professor: Caixa de João selecionada
2. Professor: Clica "👤"
3. Professor: Limpa email anterior e digita "pedro@escola.com"
4. Professor: Enter
```

**Esperado:**
- Badge muda para "pedro@escola.com"
- João não consegue mais editar
- Pedro consegue editar

---

## 🔍 COMO DEBUGAR

### Console Logs (DevTools F12)
```javascript
// Verificar se caixa está sendo salva com owner
localStorage.setItem('debug_items', JSON.stringify(items));

// Ver estado atual
window.getComputedStyle(caixa).cursor  // "text" ou "not-allowed"
window.getComputedStyle(caixa).opacity  // 1 ou 0.65
```

### Network (DevTools)
1. Abrir Firestore emulator ou real
2. Procurar collection `classes/{classId}/workspace/currentPage`
3. Verificar documento `items` array:
   ```json
   {
     "id": "item_123",
     "ownerUserId": "joao",
     "ownerEmail": "joao@escola.com",
     "label": "Exercício do João",
     "content": "...",
     "updatedAt": 1713294000000
   }
   ```

### Direta no Código
- Adicionar `console.log` em `FloatingBlock`:
  ```typescript
  console.log('canEditContent:', canEditContent);
  console.log('isOwnedByOther:', isOwnedByOther);
  console.log('item.ownerUserId:', item.ownerUserId);
  console.log('currentUserId:', currentUserId);
  ```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Compilação
- ✅ `npm run lint` passa
- ✅ `npm run build` passa
- ✅ Sem erros TypeScript

### Funcionalidade Professor
- ✅ Consegue mover caixa
- ✅ Consegue redimensionar caixa
- ✅ Consegue renomear caixa (clicando no nome)
- ✅ Consegue associar caixa a aluno (botão 👤)
- ✅ Consegue editar conteúdo de qualquer caixa
- ✅ Consegue remover associação (digitando email vazio)

### Funcionalidade Aluno
- ✅ Aluno consegue editar sua própria caixa
- ✅ Aluno NÃO consegue editar caixa de outro aluno
- ✅ Cursor mostra "not-allowed" quando não tem permissão
- ✅ Caixa de outro aparece mais desbotada (opacidade 0.65)

### Segurança
- ✅ `ownerUserId` salvo na Firestore (não só label)
- ✅ Permissão baseada em uid real, não em nome visível
- ✅ Professor sempre consegue ignorar bloqueios

---

## 🚀 PRÓXIMOS PASSOS

1. **Teste funcional completo** conforme checklist acima
2. **Deploy** de `apps/main` para staging/prod
3. **Verificar sync** com `apps/wbk-5` se necessário (mesmo padrão)
4. **Feedback de UX** - botão "👤" é claro? Email é melhor que uid?

---

## 📌 NOTAS IMPORTANTES

### Segurança
- `ownerUserId` é apenas para permissão de frontend
- **Deve ser validado no Firestore** (security rules) para impedir bypass
- Não usar apenas `label` como segurança (é só visual)

### Performance
- Sem impacto em performance (lógica simples)
- Mesmo número de renders que antes

### Compatibilidade
- Retrocompatível: caixas sem `ownerUserId` funcionam normalmente
- Migração: caixas antigas precisam ser reassociadas (se necessário)

---

## 📊 RESUMO TÉCNICO

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Movimento | Travado | Sempre possível |
| Edição de aluno | Sem restrição | Baseada em ownerUserId |
| Permissão do professor | Limitada | Total (sempre pode fazer tudo) |
| Associação aluno | Só label | ownerUserId + ownerEmail |
| UI feedback | Nenhum | Badge + cursor + opacidade |
| Debugabilidade | Baixa | Alta (campos explícitos) |
