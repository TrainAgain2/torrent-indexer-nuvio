# Validação de providers — 18 de setembro de 2026

Foram analisados os quatro módulos em [`saimuelbr/saimuel-nuvio-repo`](https://github.com/saimuelbr/saimuel-nuvio-repo/tree/main/providers) antes de qualquer inclusão no addon. Os módulos upstream são distribuídos sob a licença MIT, mas estão ofuscados; por isso, nenhum deles foi copiado nem executado pelo addon público.

| Provider | Teste isolado | Teste no deployment público | Decisão |
| --- | --- | --- | --- |
| FSHD | Devolveu uma stream de série numa execução com rede limitada. Contudo, depende de páginas e URLs posteriores definidos pela resposta remota. | Não publicado. A API necessária não respondeu de forma reprodutível com um adaptador restrito. | Não incluir. |
| MegaEmbed | Devolveu resultados para um filme e uma série com um adaptador próprio. | O deployment público respondeu sem resultados, inclusive após alinhar cabeçalhos de navegador. | Não incluir. |
| Peachify | Não executado: endpoints e chaves são ocultados por ofuscação e respostas cifradas. | Não aplicável. | Não incluir. |
| Redeflix | Não devolveu resultados para filme nem série nos casos de referência. | Não publicado. | Não incluir. |

## Critério aplicado

Um provider só é integrado quando devolve resultados em testes controlados **e** no endpoint público. O servidor não pode seguir URLs de vídeo ou outros destinos definidos por uma resposta remota. Esta regra evita publicar resultados instáveis e reduz o risco de pedidos de rede não validados.

O addon permanece funcional com as fontes já validadas e mantém o logo absoluto no manifesto para exibição nos cards do Nuvio.
