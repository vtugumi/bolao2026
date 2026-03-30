# Deploy do Bolao Copa 2026 - Passo a Passo

## Custo: R$ 0,00 (tudo gratuito)
- Vercel (hospedagem): gratis
- Neon (banco PostgreSQL): gratis (ate 0.5GB)
- GitHub (codigo): gratis
- Dominio .vercel.app: gratis (automatico)

---

## PASSO 1 - Criar conta no GitHub

1. Acesse https://github.com e crie uma conta (ou use a existente)
2. Clique no "+" no canto superior direito > "New repository"
3. Configure:
   - Repository name: `bolao2026`
   - Visibilidade: **Private**
   - NAO marque "Add a README" nem ".gitignore" (ja temos)
4. Clique "Create repository"
5. Copie a URL do repositorio (ex: `https://github.com/SEU_USUARIO/bolao2026.git`)

---

## PASSO 2 - Criar banco no Neon

1. Acesse https://neon.tech
2. Clique "Sign Up" (pode logar com a conta GitHub)
3. Clique "New Project":
   - Project name: `bolao2026`
   - Region: **South America (Sao Paulo)** - sa-east-1
4. Apos criar, copie a **connection string** que aparece
   - Formato: `postgresql://neondb_owner:SENHA@ep-NOME.sa-east-1.aws.neon.tech/neondb?sslmode=require`
   - GUARDE essa string, vai precisar nos passos 4 e 5

---

## PASSO 3 - Subir codigo para o GitHub

Abra o terminal (Git Bash ou CMD) na pasta do projeto e execute os comandos abaixo, UM POR VEZ:

```bash
cd "C:\Users\vtugu\OneDrive\Área de Trabalho\bolao2026"

git init

git add .

git commit -m "Bolao Copa 2026 - versao inicial"

git branch -M main

git remote add origin https://github.com/SEU_USUARIO/bolao2026.git

git push -u origin main
```

IMPORTANTE: Substitua `SEU_USUARIO` pelo seu usuario do GitHub.
Se pedir login, use seu usuario e um Personal Access Token (nao a senha).
Para criar o token: GitHub > Settings > Developer settings > Personal access tokens > Generate new token

---

## PASSO 4 - Alterar banco de SQLite para PostgreSQL

ANTES de fazer o deploy no Vercel, altere o arquivo `prisma/schema.prisma`:

Troque a linha:
```
provider = "sqlite"
```
Por:
```
provider = "postgresql"
```

Depois suba a alteracao:
```bash
git add prisma/schema.prisma
git commit -m "Alterar banco para PostgreSQL para deploy"
git push
```

---

## PASSO 5 - Deploy no Vercel

1. Acesse https://vercel.com
2. Clique "Sign Up" e entre com a conta **GitHub**
3. Clique "Add New" > "Project"
4. Encontre o repositorio `bolao2026` na lista e clique "Import"
5. Na tela de configuracao, em **Environment Variables**, adicione:

   | Name           | Value                                                    |
   |----------------|----------------------------------------------------------|
   | DATABASE_URL   | (cole a connection string do Neon - passo 2)             |
   | JWT_SECRET     | (invente uma senha forte, ex: bolao2026-prod-xK9mP2qR)  |

6. Clique **Deploy**
7. Aguarde o build (2-3 minutos)
8. Ao finalizar, o Vercel mostra a URL do seu app (ex: bolao2026.vercel.app)

---

## PASSO 6 - Criar tabelas e popular dados no banco

As tabelas ainda nao existem no Neon. Para cria-las:

1. Edite o arquivo `.env` LOCAL (na sua maquina) e TROQUE temporariamente o DATABASE_URL:
```
DATABASE_URL="postgresql://neondb_owner:SENHA@ep-NOME.sa-east-1.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="bolao2026-secret-change-in-production"
```

2. Execute no terminal:
```bash
cd "C:\Users\vtugu\OneDrive\Área de Trabalho\bolao2026"

npx prisma db push

npx tsx prisma/seed.ts
```

3. O primeiro comando cria as tabelas. O segundo popula com os 48 times e 104 jogos.

4. IMPORTANTE: Depois de popular, volte o `.env` para SQLite se quiser continuar desenvolvendo local:
```
DATABASE_URL="file:./dev.db"
```

---

## PASSO 7 - Testar e compartilhar!

1. Acesse a URL do Vercel (ex: https://bolao2026.vercel.app)
2. Crie uma conta de admin:
   - Registre normalmente pelo site
   - Depois, no Neon dashboard (https://console.neon.tech), abra o SQL Editor e execute:
     ```sql
     UPDATE "User" SET "isAdmin" = true WHERE email = 'SEU_EMAIL';
     ```
3. Compartilhe a URL com os participantes do bolao!

---

## Troubleshooting

### "Build failed" no Vercel
- Verifique se as Environment Variables estao corretas
- Verifique se o schema.prisma tem `provider = "postgresql"`

### "Cannot connect to database"
- Verifique se a connection string do Neon esta correta no Vercel
- No Neon dashboard, verifique se o projeto esta ativo

### Preciso atualizar o codigo
Apos fazer alteracoes locais:
```bash
git add .
git commit -m "descricao da alteracao"
git push
```
O Vercel faz o redeploy automaticamente!

### Dominio personalizado (opcional)
Se quiser um dominio proprio (ex: bolao2026.com.br):
1. Compre em https://registro.br (~R$40/ano)
2. No Vercel: Settings > Domains > Add Domain
3. Configure os DNS conforme instrucoes do Vercel
