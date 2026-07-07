import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const faqContent = readFileSync(join(__dirname, '..', 'faq.txt'), 'utf-8');

// Faz o parse do faq.txt em pares { pergunta, resposta, categoria }.
function parseFaq(texto) {
  const linhas = texto.split(/\r?\n/);
  const pares = [];
  let atual = null;   // par sendo montado
  let modo = null;    // 'P' ou 'R'
  let categoria = '';

  const ehSeparador = (l) => /^[=─\-\s]+$/.test(l) && l.trim().length > 0;
  const ehTitulo = (l) => /^\d+\.\s+[A-Za-zÀ-Ú]/.test(l) || /^[A-ZÀ-Ú][A-ZÀ-Ú \-\/]{3,}$/.test(l);

  const fechar = () => {
    if (atual && atual.pergunta && atual.resposta) {
      atual.resposta = atual.resposta.trim();
      pares.push(atual);
    }
    atual = null; modo = null;
  };

  for (const linha of linhas) {
    const t = linha.trim();

    if (/^P:\s*/i.test(t)) {
      fechar();
      atual = { pergunta: t.replace(/^P:\s*/i, ''), resposta: '', categoria };
      modo = 'P';
    } else if (/^R:\s*/i.test(t)) {
      // Remove "R:" repetido (ex.: "R: R: ...") que existe em alguns itens.
      atual && (atual.resposta = t.replace(/^(R:\s*)+/i, ''));
      modo = 'R';
    } else if (!atual) {
      // Fora de um par: pode ser um título de seção (vira categoria).
      if (t && !ehSeparador(t) && ehTitulo(t)) {
        categoria = t.replace(/^\d+\.\s*/, '').trim();
      }
    } else if (modo === 'P') {
      if (t) atual.pergunta += ' ' + t;
    } else if (modo === 'R') {
      // Uma nova seção/separador encerra a resposta atual.
      if (ehSeparador(t) || ehTitulo(t)) { fechar(); if (ehTitulo(t)) categoria = t.replace(/^\d+\.\s*/, '').trim(); }
      else atual.resposta += '\n' + linha;
    }
  }
  fechar();
  return pares;
}

const PARES = parseFaq(faqContent);

export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).json({ pares: PARES });
}
