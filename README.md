# Torrent Indexer Nuvio

Addon de streams para **Nuvio**, mantido por **TrainAgain**. Converte resultados públicos do Torrent Indexer em fontes BitTorrent compatíveis com filmes e séries por IMDb.

## Instalação no Nuvio

Depois da publicação na Vercel, use:

```text
https://<domínio-vercel>/manifest.json
```

No Nuvio, abra **Perfil → Addons → Adicionar addon a partir de URL** e cole o URL acima.

## Rotas

| Rota | Função |
| --- | --- |
| `/manifest.json` | Manifesto do addon. |
| `/stream/movie/{imdbId}.json` | Streams de filmes. |
| `/stream/series/{imdbId}:{temporada}:{episódio}.json` | Streams de episódios. |
| `/healthz` | Estado do serviço. |

## Publicar na Vercel

1. Entre em [Vercel](https://vercel.com/login) usando a conta GitHub **TrainAgain2**.
2. Selecione **Add New → Project** e importe este repositório.
3. Clique em **Deploy**; não são necessárias variáveis de ambiente.
4. Copie o domínio `vercel.app` fornecido e acrescente `/manifest.json`.

## Executar localmente

```bash
npm test
npm start
```

O serviço local fica em `http://localhost:3000/manifest.json`.

Utilize apenas conteúdo para o qual tenha direitos de acesso e em conformidade com a legislação aplicável.
