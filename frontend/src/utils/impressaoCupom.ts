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
      '<div style="font-weight:bold;">' + i.nome + '</div>' +
      '<div class="item-row">' +
        '<span>' + i.quantidade + 'x R$ ' + i.preco.toFixed(2).replace('.', ',') + '</span>' +
        '<span>R$ ' + (i.quantidade * i.preco).toFixed(2).replace('.', ',') + '</span>' +
      '</div>' +
    '</div>'
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Comprovante de Compra - TT Store</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; width: 280px; margin: 0 auto; padding: 10px; font-size: 12px; color: #000; }
        .text-center { text-align: center; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        .title { font-size: 15px; font-weight: bold; }
        .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
        .bold { font-weight: bold; }
        @media print { body { width: 100%; padding: 0; } }
      </style>
    </head>
    <body>
      <div class="text-center">
        <div class="title">TT STORE & BARBEARIA</div>
        <div>COMPROVANTE DE COMPRA</div>
        <div>Data: ${dataHoje} às ${horaHoje}</div>
        ${clienteNome ? `<div style="margin-top:3px;font-weight:bold;">Cliente: ${clienteNome}</div>` : ''}
      </div>
      
      <div class="line"></div>
      
      <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:11px;">
        <span>ITEM</span>
        <span>QTD x VALOR</span>
      </div>
      
      <div class="line"></div>

      ${itensHtml}

      <div class="line"></div>

      <div class="item-row">
        <span>Subtotal:</span>
        <span>R$ ${subtotalVal.toFixed(2).replace('.', ',')}</span>
      </div>
      ${descontoVal > 0 ? `
        <div class="item-row" style="color:red;">
          <span>Desconto:</span>
          <span>- R$ ${descontoVal.toFixed(2).replace('.', ',')}</span>
        </div>
      ` : ''}
      <div class="item-row bold" style="font-size:13px; margin-top:2px;">
        <span>TOTAL COMPRA:</span>
        <span>R$ ${totalVal.toFixed(2).replace('.', ',')}</span>
      </div>

      <div class="line"></div>

      <div class="item-row">
        <span>Forma Pagto:</span>
        <span>${formaPag}</span>
      </div>
      ${trocoVal > 0 ? `
        <div class="item-row">
          <span>Troco:</span>
          <span>R$ ${trocoVal.toFixed(2).replace('.', ',')}</span>
        </div>
      ` : ''}

      <div class="line"></div>

      <div class="text-center" style="margin-top: 10px;">
        <div>Obrigado pela preferência!</div>
        <div>Volte sempre!</div>
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
