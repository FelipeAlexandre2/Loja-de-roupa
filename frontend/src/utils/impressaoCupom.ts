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
    '<div style="margin-bottom: 3px;">' +
      '<div style="font-weight:700; color:#000; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + i.nome + '</div>' +
      '<div class="item-row">' +
        '<span style="color:#444;">' + i.quantidade + 'x R$ ' + i.preco.toFixed(2).replace('.', ',') + '</span>' +
        '<span style="font-weight:600;">R$ ' + (i.quantidade * i.preco).toFixed(2).replace('.', ',') + '</span>' +
      '</div>' +
    '</div>'
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Cupom - TT Store</title>
      <style>
        @page { size: auto; margin: 0mm; }
        body {
          font-family: 'Consolas', 'Courier New', monospace;
          width: 220px;
          margin: 0 auto;
          padding: 8px 4px;
          font-size: 10.5px;
          color: #000;
          line-height: 1.3;
          background: #fff;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .line { border-top: 1px dashed #000; margin: 5px 0; }
        .title { font-size: 13px; font-weight: 900; letter-spacing: 0.5px; }
        .subtitle { font-size: 9.5px; color: #333; text-transform: uppercase; margin-top: 1px; }
        .item-row { display: flex; justify-content: space-between; font-size: 10px; }
        .bold { font-weight: 800; }
        @media print {
          body { width: 100%; padding: 2px; }
        }
      </style>
    </head>
    <body>
      <div class="text-center">
        <div class="title">TT STORE & BARBEARIA</div>
        <div class="subtitle">Comprovante de Compra</div>
        <div style="font-size:9px; margin-top:2px; color:#555;">${dataHoje} - ${horaHoje}</div>
        ${clienteNome ? `<div style="margin-top:3px; font-weight:bold; font-size:10px;">Cliente: ${clienteNome}</div>` : ''}
      </div>
      
      <div class="line"></div>
      
      <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:9.5px; color:#333;">
        <span>PRODUTO</span>
        <span>VALOR</span>
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

      <div class="text-center" style="margin-top: 6px; font-size: 9.5px; color: #444;">
        <div>Obrigado pela preferência!</div>
        <div style="font-weight: bold; margin-top: 1px;">Volte Sempre!</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;
  win.document.write(html);
  win.document.close();
};
