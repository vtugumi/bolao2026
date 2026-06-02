# Bolao Copa do Mundo 2026 - Documentacao do Projeto

**Ultima atualizacao:** 02/06/2026
**Responsavel:** Vinicius Tugumi
**URL:** https://bolao2026-omega.vercel.app
**Repositorio:** https://github.com/vtugumi/bolao2026

---

## 1. Visao Geral

Sistema de bolao online para a Copa do Mundo FIFA 2026. Permite que grupos de amigos/familia/trabalho facam palpites de todos os jogos e disputem um ranking. Projetado para ~80 usuarios simultaneos.

### Stack Tecnologica

| Camada | Tecnologia | Detalhes |
|--------|-----------|----------|
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 | App Router, Turbopack |
| Backend | Next.js API Routes (serverless) | Vercel Functions |
| Banco de dados | PostgreSQL (Neon) | Projeto: crimson-bird-59712355, regiao Sao Paulo |
| Autenticacao | JWT + bcrypt | Cookie httpOnly, 7 dias |
| Hosting | Vercel (Hobby/free) | Team SACUL |
| API de dados | football-data.org (free) | Resultados automaticos |
| Cron | cron-job.org (free) | Sync a cada 5 minutos |

---

## 2. Credenciais e Acessos

### Conta Admin do Bolao
- **Email:** admin@bolao.com
- **Senha:** (alterada em 02/06/2026 - nao registrada aqui por seguranca)
- **Funcao:** Gerenciar resultados, bonus, usuarios. Nao aparece no ranking.

### Vercel
- **Team:** SACUL (Hobby/free)
- **Projeto:** bolao2026
- **Login:** via GitHub (vtugumi)

### Neon (Banco de Dados)
- **Projeto:** crimson-bird-59712355
- **Regiao:** Sao Paulo
- **Console:** https://console.neon.tech/app/projects/crimson-bird-59712355

### football-data.org
- **API Key:** configurada como env var FOOTBALL_API_KEY no Vercel
- **Limite:** 10 requests/minuto (free tier, sem limite diario)
- **Competicao:** WC (World Cup)

### cron-job.org
- **Job:** Bolao Sync Results
- **URL:** /api/cron/sync-results?key=[CRON_SECRET]
- **Frequencia:** a cada 5 minutos
- **Protecao:** CRON_SECRET como query parameter

### Variaveis de Ambiente (Vercel)

| Variavel | Descricao |
|----------|-----------|
| DATABASE_URL | String de conexao PostgreSQL (Neon) |
| JWT_SECRET | Chave para assinar tokens JWT |
| FOOTBALL_API_KEY | Chave da API football-data.org |
| CRON_SECRET | Chave de protecao do endpoint cron |

---

## 3. Grupo Ativo

| Grupo | Codigo | Criado em |
|-------|--------|-----------|
| BOLAO TDS COPA 2026 | VKA-LLWE | 02/06/2026 |

---

## 4. Arquitetura por Camadas

### 4.1 Banco de Dados (Prisma)

**8 modelos:**
- **User** - id, name, email, passwordHash, isAdmin
- **Team** - id, name, code, flagEmoji, groupLabel (A-L)
- **Match** - id, matchNumber (1-104), stage, groupLabel, dateTime, homeScore, awayScore, winnerId
- **Prediction** - userId + matchId (unico), homeScore, awayScore, winnerId, points
- **BonusPrediction** - userId + type (unico), value, points. Tipos: CHAMPION, RUNNER_UP, THIRD_PLACE, FOURTH_PLACE, TOP_SCORER
- **Setting** - key/value. Chaves: tournamentStartDate, officialChampion, officialRunnerUp, officialTopScorer, officialThirdPlace, officialFourthPlace
- **PrivateGroup** - id, name, inviteCode, creatorId
- **GroupMember** - userId + groupId (unico)

### 4.2 Autenticacao

- Registro: nome + email + senha (min 6 chars) + confirmacao
- Login: email + senha → JWT (7 dias) em cookie httpOnly
- Sessao: /api/auth/me verifica token a cada carregamento
- Troca de senha: /api/auth/change-password (qualquer usuario logado)
- Protecao de rotas: AuthGuard (client-side, redireciona para /login)

### 4.3 Pontuacao

**Fase de Grupos:**
- Placar exato: 5 pontos
- Acertou resultado (V/E/D): 2 pontos
- Errou ou nao palpitou: 0 pontos

**Mata-mata:**
- Placar exato + classificado correto: 8 pontos
- Classificado correto (placar errado): 5 pontos
- Errou ou nao palpitou: 0 pontos

**Bonus (pre-Copa):**
- Campeao: 120 pontos
- Vice-campeao: 80 pontos
- Terceiro lugar: 50 pontos
- Quarto lugar: 50 pontos
- Artilheiro: 80 pontos

### 4.4 Ranking

Ordenacao (desempate):
1. Total de pontos (desc)
2. Placares exatos (desc)
3. Bonus acertados (desc)
4. Pontos no mata-mata (desc)
5. Hash de desempate (SHA256 do userId)

**Importante:** O ranking mostra apenas membros do grupo do usuario. Admin (isAdmin=true) nao aparece.

### 4.5 Automacao de Resultados

**Fluxo:**
1. cron-job.org chama GET /api/cron/sync-results?key=SECRET a cada 5 min
2. Endpoint busca jogos FINISHED na API football-data.org
3. Para cada jogo finalizado sem resultado no banco:
   - Salva placar (homeScore, awayScore, winnerId)
   - Calcula pontos de TODOS os palpites desse jogo
   - Propaga vencedor no bracket do mata-mata
4. Se API falhar, nada acontece (fallback: admin registra manual)

**Mata-mata:** Para palpites, usa o placar dos 90 minutos (regularTime). Penaltis sao registrados separadamente. O vencedor (quem avanca) e determinado pelo fullTime + penalties.

### 4.6 Bracket do Mata-mata

- Jogos 1-72: Fase de Grupos (12 grupos x 6 jogos)
- Jogos 73-88: 16 avos de final (R32)
- Jogos 89-96: Oitavas de final (R16)
- Jogos 97-100: Quartas de final (QF)
- Jogos 101-102: Semifinais (SF)
- Jogo 103: Disputa de 3o lugar (3RD)
- Jogo 104: Final (FINAL)

Propagacao automatica: vencedor vai para o proximo jogo. Perdedores das semis vao para o jogo 103.

---

## 5. API Routes

### Autenticacao
| Rota | Metodo | Descricao |
|------|--------|-----------|
| /api/auth/login | POST | Login (email + senha) |
| /api/auth/registro | POST | Criar conta |
| /api/auth/me | GET | Usuario atual |
| /api/auth/logout | POST | Logout |
| /api/auth/change-password | POST | Trocar senha |

### Palpites
| Rota | Metodo | Descricao |
|------|--------|-----------|
| /api/predictions | GET/POST | Palpites de jogos do usuario |
| /api/predictions/bonus | GET/POST | Palpites bonus do usuario |
| /api/predictions/bonus/group | GET | Palpites bonus de todo o grupo (so apos inicio da Copa) |

### Jogos e Rankings
| Rota | Metodo | Descricao |
|------|--------|-----------|
| /api/matches | GET | Listar jogos (filtros: stage, groupLabel) |
| /api/matches/[id] | GET | Detalhe de um jogo |
| /api/matches/[id]/predictions | GET | Palpites do grupo para um jogo (so apos inicio) |
| /api/rankings | GET | Ranking global (exclui admins) |
| /api/rankings/[userId] | GET | Ranking de um usuario |

### Grupos
| Rota | Metodo | Descricao |
|------|--------|-----------|
| /api/groups/private | GET/POST | Listar/criar grupos |
| /api/groups/private/[groupId] | GET | Detalhes do grupo com ranking |
| /api/groups/private/join | POST | Entrar em grupo via inviteCode |

### Admin
| Rota | Metodo | Descricao |
|------|--------|-----------|
| /api/admin/results | POST | Registrar resultado de jogo (manual) |
| /api/admin/bonus | GET/POST | Resultados bonus oficiais |
| /api/admin/bonus/predictions | GET | Ver todos os palpites bonus |
| /api/admin/bonus/override | POST | Ajustar pontuacao manual (artilheiro) |
| /api/admin/users | GET/POST | Gerenciar usuarios |
| /api/admin/teams | POST | Gerenciar times |
| /api/admin/cleanup | POST | Deletar usuario e limpar dados |
| /api/admin/remove-member | POST | Remover membro de grupo |
| /api/admin/update-playoff-teams | POST | Atualizar times dos playoffs |

### Cron
| Rota | Metodo | Descricao |
|------|--------|-----------|
| /api/cron/sync-results | GET | Sincronizar resultados (protegido por CRON_SECRET) |

---

## 6. Paginas

| Pagina | Rota | Descricao |
|--------|------|-----------|
| Home | / | Landing page com regras e pontuacao |
| Login | /login | Email + senha |
| Registro | /registro | Criar conta |
| Jogos | /jogos | Todos os jogos com palpites |
| Classificacao | /classificacao | Tabelas dos grupos (seleções) |
| Palpites | /palpites | Meus palpites |
| Palpites Bonus | /palpites/bonus | Bonus + palpites do grupo apos Copa |
| Ranking | /ranking | Ranking do grupo |
| Grupos | /grupos | Criar/entrar em grupos |
| Admin | /admin | Painel administrativo |
| Admin Bonus | /admin/bonus | Gerenciar resultados bonus |
| Admin Resultados | /admin/resultados | Registrar resultados manualmente |

---

## 7. Funcionalidades Principais

1. **Resultados automaticos** - Via API football-data.org + cron a cada 5 min
2. **Palpites ocultos** - So revelados apos inicio do jogo
3. **Auto-save** - Palpite salva automaticamente ao digitar
4. **Bloqueio automatico** - Palpite trava quando o jogo comeca
5. **Palpites bonus** - 5 categorias, bloqueiam no inicio da Copa
6. **Bonus visiveis** - Apos Copa comecar, todos veem os palpites bonus do grupo
7. **Ranking por grupo** - Cada grupo tem seu ranking isolado
8. **Multiplos grupos** - Um usuario pode participar de varios
9. **Mata-mata inteligente** - Bracket preenchido automaticamente
10. **Admin oculto** - Conta admin nao aparece no ranking
11. **Responsivo** - Funciona em celular, tablet e desktop

---

## 8. Operacao Diaria (Admin)

### Durante a Copa (automatico)
- Resultados entram automaticamente a cada 5 min
- Pontuacao calculada automaticamente
- Bracket atualizado automaticamente
- **Nao precisa fazer nada!**

### Se a API falhar
1. Login como admin (admin@bolao.com)
2. Admin → Resultados → selecionar jogo → digitar placar
3. Pontuacao e calculada automaticamente

### Ao final da Copa
1. Admin → Bonus → definir campeao, vice, 3o, 4o oficiais
2. Pontuacao bonus calculada automaticamente
3. Artilheiro: conferir variacoes de nome e usar botoes de override

---

## 9. Historico de Mudancas (02/06/2026)

1. Site deployado e funcionando no Vercel (resolvido 404 com Framework Preset)
2. Pontuacao bonus atualizada (120/80/50/50/80)
3. Novas perguntas bonus (3o e 4o lugar)
4. Errou = 0 pontos (era 1 ponto)
5. 6 times de playoffs atualizados (Tchequia, Bosnia, Turquia, Suecia, Iraque, RD Congo)
6. Automacao de resultados via football-data.org + cron-job.org
7. Placeholder de palpite mudado de "0" para "-"
8. Ranking filtrado por grupo (nao mostra usuarios de outros grupos)
9. Admin oculto do ranking
10. Palpites bonus visiveis para o grupo apos inicio da Copa
11. Endpoint de troca de senha
12. Endpoints administrativos (cleanup, remove-member, delete-user)
