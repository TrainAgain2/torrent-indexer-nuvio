# Torrent Indexer Nuvio

Addon de streams para **Nuvio**, mantido por **TrainAgain**. Reúne resultados online e BitTorrent compatíveis com filmes e séries por IMDb.

## Instalação no Nuvio

Use este link de instalação:

```text
https://torrent-indexer-nuvio.vercel.app/manifest.json
```

No Nuvio, abra **Perfil → Addons → Adicionar addon a partir de URL**, cole o link acima e confirme.

O addon disponibiliza apenas resultados de filmes e séries solicitados pelo Nuvio; não adiciona catálogos externos à página inicial.

## Providers validados

O addon usa um adaptador próprio para o **MegaEmbed**, validado para filmes e séries. O servidor consulta apenas a página do provider, valida os URLs HTTPS apresentados e devolve os resultados ao Nuvio; não descarrega nem segue URLs de vídeo no servidor.

Os módulos upstream que não passaram a revisão de segurança ou não devolveram resultados no teste controlado não são incluídos.

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
