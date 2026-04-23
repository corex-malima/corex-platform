%% canon.cls — Clase documental institucional CoreX
%% Versión 1.0 — 2026-04-22
%% pdflatex-compatible, Overleaf-portable
%%
%% Uso: \documentclass{canon}   (o \documentclass{../base/canon})
%% ──────────────────────────────────────────────────────────────────────

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{canon}[2026/04/22 v1.0 Clase documental Canon CoreX]

%% ── Base ──────────────────────────────────────────────────────────────
\LoadClass[11pt,a4paper]{article}

%% ── Encoding y fuentes ───────────────────────────────────────────────
\RequirePackage[T1]{fontenc}
\RequirePackage[utf8]{inputenc}
\RequirePackage{tgpagella}          % TeX Gyre Pagella (body)
\RequirePackage[scaled=0.94]{helvet}% Helvetica scaled (sans)
\RequirePackage{inconsolata}        % Inconsolata (mono)
\RequirePackage{microtype}

%% ── Layout ────────────────────────────────────────────────────────────
\RequirePackage[
  a4paper,
  top=28mm, bottom=28mm,
  left=26mm, right=26mm,
  headheight=18mm,
  headsep=6mm,
  footskip=12mm
]{geometry}

%% ── Colores ───────────────────────────────────────────────────────────
\RequirePackage[table]{xcolor}
\definecolor{CanonInk}     {HTML}{202020}
\definecolor{CanonMuted}   {HTML}{6B6B6B}
\definecolor{CanonRule}    {HTML}{D7D7D7}
\definecolor{CanonSoft}    {HTML}{F8F8F6}
\definecolor{CanonSoftLine}{HTML}{E1E1DD}
\definecolor{CanonRed}     {HTML}{C0392B}
\definecolor{CanonAccent}  {HTML}{1A56A0}

%% Color base del texto
\color{CanonInk}

%% ── Gráficos ──────────────────────────────────────────────────────────
\RequirePackage{graphicx}
\RequirePackage{ifthen}
\RequirePackage{etoolbox}

%% ── Tablas ────────────────────────────────────────────────────────────
\RequirePackage{booktabs}
\RequirePackage{longtable}
\RequirePackage{adjustbox}
\RequirePackage{array}
\RequirePackage{multirow}

%% ── Listas ────────────────────────────────────────────────────────────
\RequirePackage{enumitem}
\setlist[itemize]{leftmargin=1.4em, topsep=3pt, itemsep=2pt}
\setlist[enumerate]{leftmargin=1.4em, topsep=3pt, itemsep=2pt}

%% ── Cajas (tcolorbox) ─────────────────────────────────────────────────
\RequirePackage[most]{tcolorbox}

%% ── Flotantes ─────────────────────────────────────────────────────────
\RequirePackage{float}
\RequirePackage{caption}
\captionsetup{
  font={small, color=CanonMuted},
  labelfont=bf,
  labelsep=period,
  skip=6pt
}

%% ── Encabezado / Pie de página ────────────────────────────────────────
\RequirePackage{fancyhdr}
\RequirePackage{lastpage}

%% ── Títulos de sección ────────────────────────────────────────────────
\RequirePackage{titlesec}

\titleformat{\section}
  {\large\bfseries\color{CanonInk}}
  {\thesection.}{0.5em}{}
  [\vspace{2pt}\color{CanonRule}\titlerule\vspace{2pt}]

\titleformat{\subsection}
  {\normalsize\bfseries\color{CanonInk}}
  {\thesubsection.}{0.4em}{}

\titleformat{\subsubsection}
  {\small\bfseries\color{CanonMuted}}
  {\thesubsubsection.}{0.4em}{}

\titlespacing*{\section}      {0pt}{14pt}{6pt}
\titlespacing*{\subsection}   {0pt}{10pt}{4pt}
\titlespacing*{\subsubsection}{0pt}{8pt}{3pt}

%% ── Hyperref ──────────────────────────────────────────────────────────
\RequirePackage[
  colorlinks=true,
  linkcolor=CanonAccent,
  urlcolor=CanonAccent,
  citecolor=CanonAccent,
  pdfborder={0 0 0}
]{hyperref}

%% ══════════════════════════════════════════════════════════════════════
%% METADATOS DEL DOCUMENTO
%% ══════════════════════════════════════════════════════════════════════

\newcommand{\@doctype}  {DOCUMENTO}
\newcommand{\@doctitle} {Sin título}
\newcommand{\@doccode}  {}
\newcommand{\@docarea}  {}
\newcommand{\@docauthor}{}
\newcommand{\@docdate}  {\today}
\newcommand{\@doclogo}  {}
\newcommand{\@docunit}  {}
\newcommand{\@contactunit}   {}
\newcommand{\@contactmembers}{}
\newcommand{\@contactnote}   {}

\newcommand{\SetDocType}[1]  {\renewcommand{\@doctype}{#1}}
\newcommand{\SetDocTitle}[1] {\renewcommand{\@doctitle}{#1}\hypersetup{pdftitle={#1}}}
\newcommand{\SetDocCode}[1]  {\renewcommand{\@doccode}{#1}}
\newcommand{\SetDocArea}[1]  {\renewcommand{\@docarea}{#1}}
\newcommand{\SetDocAuthor}[1]{\renewcommand{\@docauthor}{#1}\hypersetup{pdfauthor={#1}}}
\newcommand{\SetDocDate}[1]  {\renewcommand{\@docdate}{#1}}
\newcommand{\SetDocLogo}[1]  {\renewcommand{\@doclogo}{#1}}
\newcommand{\SetDocUnit}[1]  {\renewcommand{\@docunit}{#1}}
\newcommand{\SetContactUnit}[1]   {\renewcommand{\@contactunit}{#1}}
\newcommand{\SetContactMembers}[1]{\renewcommand{\@contactmembers}{#1}}
\newcommand{\SetContactNote}[1]   {\renewcommand{\@contactnote}{#1}}

%% ── Logo con fallback ─────────────────────────────────────────────────
\newcommand{\InsertLogo}{%
  \ifthenelse{\equal{\@doclogo}{}}{%
    \textcolor{CanonMuted}{\footnotesize[logo]}%
  }{%
    \IfFileExists{\@doclogo}{%
      \includegraphics[height=14mm]{\@doclogo}%
    }{%
      \textcolor{CanonMuted}{\footnotesize[logo]}%
    }%
  }%
}

%% ══════════════════════════════════════════════════════════════════════
%% ENCABEZADO DEL DOCUMENTO (\CanonHeader)
%% ══════════════════════════════════════════════════════════════════════
\newcommand{\CanonHeader}{%
  \noindent
  \begin{minipage}[b]{0.22\linewidth}
    \InsertLogo
  \end{minipage}%
  \hfill
  \begin{minipage}[b]{0.74\linewidth}
    \raggedleft
    {\footnotesize\color{CanonMuted}\textsc{\@doctype}}\\[2pt]
    {\large\bfseries\color{CanonInk}\@doctitle}\\[4pt]
    \footnotesize\color{CanonMuted}
    \ifthenelse{\equal{\@doccode}{}}{}{\@doccode\quad|\quad}%
    \ifthenelse{\equal{\@docarea}{}}{}{\@docarea\quad|\quad}%
    \@docdate
    \ifthenelse{\equal{\@docauthor}{}}{}{\quad|\quad\@docauthor}%
  \end{minipage}%
  \vspace{4pt}
  \noindent\textcolor{CanonRule}{\rule{\linewidth}{0.5pt}}
  \vspace{6pt}
}

%% ══════════════════════════════════════════════════════════════════════
%% ESTILO DE PÁGINA
%% ══════════════════════════════════════════════════════════════════════
\fancypagestyle{mainstyle}{%
  \fancyhf{}
  \renewcommand{\headrulewidth}{0pt}
  \renewcommand{\footrulewidth}{0pt}
  \fancyhead[L]{%
    \scriptsize\color{CanonMuted}%
    \ifthenelse{\equal{\@doccode}{}}{}{\@doccode\enspace—\enspace}%
    \@doctitle
  }
  \fancyhead[R]{%
    \scriptsize\color{CanonMuted}\@docdate
  }
  \fancyfoot[L]{%
    \scriptsize\color{CanonMuted}%
    \ifthenelse{\equal{\@docunit}{}}{}{\@docunit}%
  }
  \fancyfoot[C]{%
    \scriptsize\color{CanonMuted}Uso interno
  }
  \fancyfoot[R]{%
    \scriptsize\color{CanonMuted}\thepage\,/\,\pageref{LastPage}
  }
}

\fancypagestyle{firstpage}{%
  \fancyhf{}
  \renewcommand{\headrulewidth}{0pt}
  \renewcommand{\footrulewidth}{0pt}
  \fancyfoot[L]{%
    \scriptsize\color{CanonMuted}%
    \ifthenelse{\equal{\@docunit}{}}{}{\@docunit}%
  }
  \fancyfoot[C]{%
    \scriptsize\color{CanonMuted}Uso interno
  }
  \fancyfoot[R]{%
    \scriptsize\color{CanonMuted}\thepage\,/\,\pageref{LastPage}
  }
}

\pagestyle{mainstyle}
\AtBeginDocument{%
  \thispagestyle{firstpage}%
  \CanonHeader%
}

%% ══════════════════════════════════════════════════════════════════════
%% COMPONENTES VISUALES
%% ══════════════════════════════════════════════════════════════════════

%% ── Separador ─────────────────────────────────────────────────────────
\newcommand{\sectionrule}{%
  \vspace{8pt}%
  \noindent\textcolor{CanonRule}{\rule{\linewidth}{0.4pt}}%
  \vspace{8pt}%
}

%% ── Cajas de contenido ────────────────────────────────────────────────

% ObservationBox — observaciones y contexto
\newenvironment{ObservationBox}[1][Observación]{%
  \begin{tcolorbox}[
    enhanced,
    breakable,
    colback=CanonSoft,
    colframe=CanonMuted,
    leftrule=3pt, toprule=0pt, bottomrule=0pt, rightrule=0pt,
    sharp corners,
    boxsep=0pt,
    left=8pt, right=8pt, top=7pt, bottom=7pt,
    before skip=10pt, after skip=10pt,
    title={\small\bfseries\color{CanonMuted}#1},
    attach title to upper={\par\smallskip},
    detach title
  ]%
}{%
  \end{tcolorbox}%
}

% KeyFindingBox — hallazgos clave
\newenvironment{KeyFindingBox}[1][Hallazgo clave]{%
  \begin{tcolorbox}[
    enhanced,
    breakable,
    colback=CanonSoft,
    colframe=CanonInk,
    leftrule=3pt, toprule=0pt, bottomrule=0pt, rightrule=0pt,
    sharp corners,
    boxsep=0pt,
    left=8pt, right=8pt, top=7pt, bottom=7pt,
    before skip=10pt, after skip=10pt,
    title={\small\bfseries\color{CanonInk}#1},
    attach title to upper={\par\smallskip},
    detach title
  ]%
}{%
  \end{tcolorbox}%
}

% WarningBox — alertas
\newenvironment{WarningBox}[1][Alerta]{%
  \begin{tcolorbox}[
    enhanced,
    breakable,
    colback=CanonSoft,
    colframe=CanonRed,
    leftrule=3pt, toprule=0pt, bottomrule=0pt, rightrule=0pt,
    sharp corners,
    boxsep=0pt,
    left=8pt, right=8pt, top=7pt, bottom=7pt,
    before skip=10pt, after skip=10pt,
    title={\small\bfseries\color{CanonRed}#1},
    attach title to upper={\par\smallskip},
    detach title
  ]%
}{%
  \end{tcolorbox}%
}

% NoteInline — nota corta en línea
\newcommand{\NoteInline}[1]{%
  \noindent{\small\bfseries\color{CanonMuted}#1}\enspace%
}

%% ── Párrafos especiales ───────────────────────────────────────────────

% ParrafoEjecutivo — audiencia no técnica
\newenvironment{ParrafoEjecutivo}{%
  \begin{tcolorbox}[
    enhanced,
    breakable,
    colback=CanonSoft,
    colframe=CanonSoftLine,
    boxrule=0.5pt,
    sharp corners,
    boxsep=0pt,
    left=10pt, right=10pt, top=8pt, bottom=8pt,
    before skip=10pt, after skip=10pt
  ]%
  \small
}{%
  \end{tcolorbox}%
}

% ParrafoMetodologico — detalles técnicos de fuentes y procedimientos
\newenvironment{ParrafoMetodologico}{%
  \vspace{4pt}%
  \noindent\textcolor{CanonSoftLine}{\rule{\linewidth}{0.4pt}}%
  \vspace{2pt}%
  \begin{quote}%
  \small\color{CanonMuted}%
}{%
  \end{quote}%
  \noindent\textcolor{CanonSoftLine}{\rule{\linewidth}{0.4pt}}%
  \vspace{4pt}%
}

%% ── KPIs ──────────────────────────────────────────────────────────────
\newcommand{\FichaKPI}[3]{%
  \begin{tcolorbox}[
    enhanced,
    colback=CanonSoft,
    colframe=CanonSoftLine,
    boxrule=0.5pt,
    sharp corners,
    boxsep=0pt,
    left=10pt, right=10pt, top=8pt, bottom=8pt,
    width=0.28\linewidth,
    halign=center
  ]%
    {\footnotesize\color{CanonMuted}#1}\\[3pt]
    {\large\bfseries\color{CanonInk}#2}\\[2pt]
    {\scriptsize\color{CanonMuted}#3}%
  \end{tcolorbox}%
}

%% ── Bloques de documento ──────────────────────────────────────────────

% MemoBlock — Para / De / Asunto / Ref
\newcommand{\MemoBlock}[4]{%
  \begin{tcolorbox}[
    enhanced,
    colback=CanonSoft,
    colframe=CanonSoftLine,
    boxrule=0.5pt,
    sharp corners,
    boxsep=0pt,
    left=10pt, right=10pt, top=8pt, bottom=8pt,
    before skip=8pt, after skip=12pt
  ]%
  \begin{tabular}{@{}lp{0.75\linewidth}@{}}
    \textbf{Para:}   & #1 \\[2pt]
    \textbf{De:}     & #2 \\[2pt]
    \textbf{Asunto:} & #3 \\[2pt]
    \textbf{Ref:}    & \texttt{#4} \\
  \end{tabular}%
  \end{tcolorbox}%
}

% AsistentesBlock — tabla de asistentes en actas
\newenvironment{AsistentesBlock}{%
  \begin{center}
  \small
  \begin{tabular}{lll}
    \toprule
    \textbf{Nombre} & \textbf{Cargo} & \textbf{Contacto} \\
    \midrule
}{%
    \bottomrule
  \end{tabular}
  \end{center}
}

% AcuerdosList — lista numerada de acuerdos en actas
\newenvironment{AcuerdosList}{%
  \begin{enumerate}[leftmargin=1.6em, label=\textbf{\arabic*.}]%
}{%
  \end{enumerate}%
}

%% ── Figura con fallback ───────────────────────────────────────────────
\newcommand{\FiguraConFallback}[3][0.9\linewidth]{%
  \begin{figure}[H]
    \centering
    \IfFileExists{#2}{%
      \includegraphics[width=#1]{#2}%
    }{%
      \FiguraPlaceholder[#1]{#3 {\color{CanonMuted}\scriptsize[archivo no encontrado: \texttt{#2}]}}%
    }%
    \caption{#3}
  \end{figure}%
}

\newcommand{\FiguraPlaceholder}[2][0.9\linewidth]{%
  \begin{tcolorbox}[
    enhanced,
    colback=CanonSoft,
    colframe=CanonRule,
    boxrule=0.5pt,
    sharp corners,
    width=#1,
    halign=center,
    height=52mm,
    valign=center
  ]%
    \color{CanonMuted}\small\itshape #2%
  \end{tcolorbox}%
}

%% ── Firma ─────────────────────────────────────────────────────────────
\newcommand{\SignatureBlock}[2]{%
  \vspace{18pt}
  \noindent
  \begin{minipage}{0.45\linewidth}
    \textcolor{CanonRule}{\rule{0.85\linewidth}{0.4pt}}\\[3pt]
    {\small\textbf{#1}}\\
    {\footnotesize\color{CanonMuted}#2}\\
    {\footnotesize\color{CanonMuted}\@docdate}
  \end{minipage}
  \vspace{10pt}
}

%% ── Bloque de contacto ────────────────────────────────────────────────
\newcommand{\ContactSignature}{%
  \vspace{12pt}
  \sectionrule
  \begin{tcolorbox}[
    enhanced,
    colback=CanonSoft,
    colframe=CanonSoftLine,
    boxrule=0.5pt,
    sharp corners,
    boxsep=0pt,
    left=10pt, right=10pt, top=8pt, bottom=8pt
  ]%
    {\small\bfseries\color{CanonMuted}\@contactunit}\\[6pt]
    \begin{tabular}{@{}lll@{}}
      \@contactmembers
    \end{tabular}%
    \ifthenelse{\equal{\@contactnote}{}}{}{%
      \\[6pt]{\footnotesize\color{CanonMuted}\@contactnote}%
    }%
  \end{tcolorbox}%
}

%% ── Código ────────────────────────────────────────────────────────────
\newcommand{\CodePath}[1]{%
  {\small\ttfamily\color{CanonAccent}#1}%
}

\newenvironment{CodeBlock}{%
  \begin{tcolorbox}[
    enhanced,
    breakable,
    colback=CanonSoft,
    colframe=CanonSoftLine,
    boxrule=0.5pt,
    sharp corners,
    boxsep=0pt,
    left=10pt, right=10pt, top=8pt, bottom=8pt,
    before skip=8pt, after skip=8pt,
    fontupper=\small\ttfamily\color{CanonInk}
  ]%
}{%
  \end{tcolorbox}%
}

%% ── Idioma ────────────────────────────────────────────────────────────
\RequirePackage[spanish,es-noindentfirst]{babel}
\spanishdecimal{.}

%% ── Párrafos ──────────────────────────────────────────────────────────
\setlength{\parindent}{0pt}
\setlength{\parskip}{6pt}
