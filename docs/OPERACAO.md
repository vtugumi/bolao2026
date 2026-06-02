# Guia de Operacao - Bolao Copa 2026

## Antes da Copa (agora ate 10/06)

### Para voce (admin):
1. Divulgar o link e codigo do grupo para a turma
2. Entrar com seu login pessoal e fazer palpites bonus + jogos
3. Monitorar se o pessoal esta entrando (Admin → painel)

### Para a turma:
1. Criar conta em bolao2026-omega.vercel.app
2. Entrar no grupo com codigo VKA-LLWE
3. Fazer palpites bonus (campeao, vice, 3o, 4o, artilheiro)
4. Comecar a palpitar os jogos da fase de grupos

---

## Durante a Copa (11/06 a 11/07)

### Automatico (nao precisa fazer nada):
- Resultados entram via API a cada 5 min
- Pontuacao calculada automaticamente
- Classificacao dos grupos atualizada
- Bracket do mata-mata preenchido quando grupos encerram

### Se algo der errado:
- **API fora**: Login admin → Admin → Resultados → digitar placar manual
- **Bug no site**: Me chamar (Vinicius → Claude) → git push → site atualiza em 1 min
- **Usuario com problema**: Admin → verificar no painel

---

## Apos a Copa

### Artilheiro (unica acao manual):
1. Login admin → Admin → Bonus
2. Preencher nome oficial do artilheiro
3. Verificar palpites com grafias diferentes (ex: "Mbappe" vs "Mbappé")
4. Usar botoes de override para aprovar variacoes

### Resultados bonus:
1. Campeao, vice, 3o, 4o → preenchidos no Admin → Bonus
2. Pontuacao recalculada automaticamente
3. Ranking final atualizado

---

## Comandos Uteis (Terminal/Curl)

### Testar sync de resultados
```
curl https://bolao2026-omega.vercel.app/api/cron/sync-results?key=[CRON_SECRET]
```

### Login como admin
```
curl -X POST https://bolao2026-omega.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bolao.com","password":"[SENHA]"}'
```

### Deletar usuario
```
curl -X POST https://bolao2026-omega.vercel.app/api/admin/cleanup \
  -H "Content-Type: application/json" \
  -H "Cookie: bolao_token=[TOKEN]" \
  -d '{"userId":[ID]}'
```

### Registrar resultado manual
```
curl -X POST https://bolao2026-omega.vercel.app/api/admin/results \
  -H "Content-Type: application/json" \
  -H "Cookie: bolao_token=[TOKEN]" \
  -d '{"matchId":[ID],"homeScore":[X],"awayScore":[Y]}'
```

---

## Contatos / Servicos

| Servico | URL | Login |
|---------|-----|-------|
| Site do bolao | bolao2026-omega.vercel.app | - |
| Vercel (hosting) | vercel.com/sacul/bolao2026 | GitHub (vtugumi) |
| Neon (banco) | console.neon.tech | - |
| GitHub (codigo) | github.com/vtugumi/bolao2026 | vtugumi |
| football-data.org | football-data.org | email cadastrado |
| cron-job.org | console.cron-job.org | email cadastrado |
