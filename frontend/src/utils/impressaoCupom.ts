interface ProdutoCart {
  id: number;
  nome: string;
  preco: number;
  quantidade: number;
}

export const gerarECupomImpressao = (
  itens: ProdutoCart[],
  subtotalVal: number,
  descontoVal: number,
  totalVal: number,
  formaPag: string,
  trocoVal: number,
  clienteNome?: string | null
) => {
  const win = window.open('', '_blank');
  if (!win) return;
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const horaHoje = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const itensHtml = itens.map(i =>
    '<div style="margin-bottom: 4px;">' +
      '<div style="font-weight:700; color:#000; word-break:break-word;">' + i.nome + '</div>' +
      '<div class="item-row">' +
        '<span style="color:#222;">' + i.quantidade + 'x R$ ' + i.preco.toFixed(2).replace('.', ',') + '</span>' +
        '<span style="font-weight:700;">R$ ' + (i.quantidade * i.preco).toFixed(2).replace('.', ',') + '</span>' +
      '</div>' +
    '</div>'
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Cupom Não Fiscal - TT Store</title>
      <style>
        * { box-sizing: border-box; }
        @page { size: auto; margin: 2mm 0mm; }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: 'Consolas', 'Courier New', monospace;
          color: #000;
          line-height: 1.25;
        }
        .cupom-box {
          width: 270px;
          max-width: 95vw;
          margin: 0 auto;
          padding: 6px 10px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .line { border-top: 1px dashed #000; margin: 4px 0; }
        .title { font-size: 13px; font-weight: 900; letter-spacing: 0.5px; }
        .subtitle { font-size: 10px; color: #000; text-transform: uppercase; margin-top: 2px; font-weight: 800; }
        .item-row { display: flex; justify-content: space-between; font-size: 10.5px; }
        .bold { font-weight: 800; }
        @media print {
          html, body { width: 100%; height: auto; margin: 0; padding: 0; }
          .cupom-box { width: 100%; max-width: 78mm; margin: 0 auto; padding: 2px 6px; page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="cupom-box">
        <div class="text-center">
          <div class="title">TT STORE & BARBEARIA</div>
          <div class="subtitle">*** COMPROVANTE NÃO FISCAL ***</div>
          <div style="font-size:9.5px; margin-top:2px;">${dataHoje} - ${horaHoje}</div>
          ${clienteNome ? `<div style="margin-top:3px; font-weight:bold; font-size:10px;">Cliente: ${clienteNome}</div>` : ''}
        </div>
        
        <div class="line"></div>
        
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:10px;">
          <span>PRODUTO</span>
          <span style="text-align:right;">VALOR</span>
        </div>
        
        <div class="line"></div>

        ${itensHtml}

        <div class="line"></div>

        <div class="item-row">
          <span>Subtotal:</span>
          <span>R$ ${subtotalVal.toFixed(2).replace('.', ',')}</span>
        </div>
        ${descontoVal > 0 ? `
          <div class="item-row" style="color:#b91c1c;">
            <span>Desconto:</span>
            <span>- R$ ${descontoVal.toFixed(2).replace('.', ',')}</span>
          </div>
        ` : ''}
        <div class="item-row bold" style="font-size:11.5px; margin-top:3px; padding-top:2px; border-top:1px dashed #000;">
          <span>TOTAL:</span>
          <span>R$ ${totalVal.toFixed(2).replace('.', ',')}</span>
        </div>

        <div class="line"></div>

        <div class="item-row">
          <span>Pagamento:</span>
          <span class="bold">${formaPag}</span>
        </div>
        ${trocoVal > 0 ? `
          <div class="item-row">
            <span>Troco:</span>
            <span>R$ ${trocoVal.toFixed(2).replace('.', ',')}</span>
          </div>
        ` : ''}

        <div class="line"></div>

        <div class="text-center" style="margin-top: 6px; font-size: 10px;">
          <div>Obrigado pela preferência!</div>
          <div style="font-weight: bold; margin-top: 1px;">Volte Sempre!</div>
        </div>
      </div>
    </body>
    </html>
  `;
  win.document.write(html);
  win.document.close();
  win.print();
};
