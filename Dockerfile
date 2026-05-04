FROM node:20-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci

FROM base AS builder

ARG SESSION_SECRET
ARG AUTH_MIN_SESSION_SECRET_LENGTH=32

ENV NODE_ENV=production
ENV SESSION_SECRET=$SESSION_SECRET
ENV AUTH_MIN_SESSION_SECRET_LENGTH=$AUTH_MIN_SESSION_SECRET_LENGTH

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p public
RUN npm run build

# Todos los stages usan Debian/glibc para evitar mezclar node_modules compilados
# en Alpine/musl con runtime Debian. Esto reduce fallos intermitentes con binarios
# nativos como sharp, SWC/Next y dependencias Python/solver.
FROM node:20-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7777
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# LaTeX runtime mínimo viable para pdf-canon (canon.cls):
#   - texlive-latex-base         → fontenc, inputenc, geometry, xcolor, graphicx, ifthen, hyperref
#   - texlive-latex-recommended  → microtype, etoolbox, booktabs, longtable, array, multirow,
#                                  enumitem, float, caption, fancyhdr, lastpage
#   - texlive-latex-extra        → tcolorbox[most], adjustbox, titlesec
#   - texlive-fonts-recommended  → helvet (sans), wrappers tgpagella.sty
#   - texlive-pictures           → tikz (lo carga tcolorbox[most])
#   - texlive-lang-spanish       → babel[spanish,es-noindentfirst]
#   - tex-gyre                   → archivos de fuente TeX Gyre Pagella (.pfb/.tfm). Con
#                                  --no-install-recommends NO se arrastra como Recommends
#                                  de texlive-fonts-recommended y por eso 'tgpagella.sty
#                                  not found' aparecía aun teniendo el .sty.
#
# Removido respecto a versiones previas:
#   - texlive-fonts-extra (~200 MB) — solo se usaba por inconsolata; canon.cls ahora usa
#     Computer Modern Typewriter (default) para `\CodePath{...}` y `CodeBlock`.
#   - lmodern — fallback no necesario; CMTT viene con texlive-latex-base.
#   - mktexlsr — innecesario; los triggers de dpkg refrescan kpathsea automáticamente
#     al instalar paquetes texlive-*.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     python3 python3-pip python3-numpy python3-pandas \
     texlive-latex-base \
     texlive-latex-recommended \
     texlive-latex-extra \
     texlive-fonts-recommended \
     texlive-pictures \
     texlive-lang-spanish \
     tex-gyre \
  && pip3 install --no-cache-dir --break-system-packages pulp \
  && ln -sf python3 /usr/bin/python \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid 1001 --no-create-home nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts/validate-runtime-env.mjs ./scripts/validate-runtime-env.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/solver_clasificacion_en_blanco_bridge.py ./scripts/solver_clasificacion_en_blanco_bridge.py
COPY --from=builder --chown=nextjs:nodejs /app/scripts/postharvest_solver_engine.py ./scripts/postharvest_solver_engine.py
COPY --from=builder --chown=nextjs:nodejs /app/pdf-canon ./pdf-canon

USER nextjs

EXPOSE 7777

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 7777) + '/api/health/live').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "node scripts/validate-runtime-env.mjs && node server.js"]
