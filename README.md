# Torrent Indexer Nuvio

Addon de streams para **Nuvio**, mantido por **TrainAgain**. Converte resultados públicos do Torrent Indexer em fontes BitTorrent compatíveis com filmes e séries por IMDb.

## Instalação no Nuvio

Use este link de instalação:

```text
https://torrent-indexer-nuvio.vercel.app/manifest.json
```

No Nuvio, abra **Perfil → Addons → Adicionar addon a partir de URL**, cole o link acima e confirme.

## Rotas

| Rota | Função |
| --- | --- |
| `/manifest.json` | Manifesto do addon. |
| `/stream/movie/{imdbId}.json` | Streams de filmes. |
| `/stream/series/{imdbId}:{temporada}:{episódio}.json` | Streams de episódios. |
| `/healthz` | Estado do serviço. |

## Executar localmente

```bash
npm test
npm start
```

O serviço local fica em `http://localhost:3000/manifest.json`.

Utilize apenas conteúdo para o qual tenha direitos de acesso e em conformidade com a legislação aplicável.
