async function getSensorStatistics(empresaId, startDate, endDate) {
    const sensoresRef = db.collection(`empresas/${empresaId}/sensores`);
    const snapshot = await sensoresRef.get();

    const statsByType = {};

    for (const sensorDoc of snapshot.docs) {
        const sensorId = sensorDoc.id;
        const sensorData = sensorDoc.data();
        const sensorType = sensorData.tipo;

        const readingsRef = db.collection(`empresas/${empresaId}/sensores/${sensorId}/leituras`);
        const readingsSnapshot = await readingsRef
            .where('timestamp', '>=', startDate)
            .where('timestamp', '<=', endDate)
            .get();

        const stats = {
            average: 0,
            min: Infinity,
            max: -Infinity,
            count: 0
        };

        readingsSnapshot.forEach(readingDoc => {
            const leitura = readingDoc.data().valor;
            stats.count++;
            stats.average += leitura;
            stats.min = Math.min(stats.min, leitura);
            stats.max = Math.max(stats.max, leitura);
        });

        if (stats.count > 0) {
            stats.average /= stats.count;
        } else {
            stats.min = null; // Set min to null when there are no readings
            stats.max = null; // Set max to null when there are no readings
        }

        statsByType[sensorType] = statsByType[sensorType] || {
            average: 0,
            min: Infinity,
            max: -Infinity,
            count: 0
        };

        if (stats.count > 0) {
            statsByType[sensorType].count += stats.count;
            statsByType[sensorType].average += stats.average * stats.count;
            statsByType[sensorType].min = Math.min(statsByType[sensorType].min, stats.min || Infinity);
            statsByType[sensorType].max = Math.max(statsByType[sensorType].max, stats.max || -Infinity);
        }
    }

    for (const sensorType in statsByType) {
        const totalCount = statsByType[sensorType].count;
        if (totalCount > 0) {
            statsByType[sensorType].average /= totalCount;
        } else {
            statsByType[sensorType].average = null;
        }
    }

    return statsByType;
}

async function countAtividades(empresaId, startDate, endDate) {
    const atividadesRef = db.collection(`empresas/${empresaId}/atividades`);
    const snapshot = await atividadesRef
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();

    let report = {
        total: 0,
        agendadas: 0,
        concluídas: 0,
        canceladas: 0
    };

    snapshot.forEach(doc => {
        report.total++;
        const atividade = doc.data();
        if (atividade.status === 'Agendada') {
            report.agendadas++;
        } else if (atividade.status === 'Concluída') {
            report.concluídas++;
        } else if (atividade.status === 'Cancelada') {
            report.canceladas++;
        }
    });

    return report;
}

async function countFuncionarios(empresaId, startDate, endDate) {
    const funcionariosRef = db.collection(`empresas/${empresaId}/funcionarios`);
    const snapshot = await funcionariosRef
        .where('dataContratacao', '>=', startDate)
        .where('dataContratacao', '<=', endDate)
        .get();

    return snapshot.size; // Retorna a quantidade de funcionários adicionados
}


async function gerarRelatorioMensal(empresaId, startDate, endDate) {
    const numFuncionarios = await countFuncionarios(empresaId, startDate, endDate);
    const atividadesReport = await countAtividades(empresaId, startDate, endDate);
    const sensorStats = await getSensorStatistics(empresaId, startDate, endDate);

    // Estrutura de dados do relatório em formato de objeto
    const report = {
        funcionariosAdicionados: numFuncionarios,
        atividadesTotal: atividadesReport.total,
        atividadesAgendadas: atividadesReport.agendadas,
        atividadesConcluidas: atividadesReport.concluídas,
        atividadesCanceladas: atividadesReport.canceladas,
        leiturasSensores: {}
    };

    // Processando as estatísticas dos sensores
    for (const sensorType in sensorStats) {
        const stats = sensorStats[sensorType];
        
        report.leiturasSensores[sensorType] = {
            media: stats.average !== null ? stats.average.toFixed(2) : 'N/A',
            minimo: stats.count > 0 ? stats.min : 'Não obtivemos leituras',
            maximo: stats.count > 0 ? stats.max : 'Não obtivemos leituras',
            totalLeituras: stats.count
        };
    }

    firebase.firestore().collection(`empresas/${empresaId}/logs`).add({
        user: firebase.auth().currentUser.email,
        action: `Gerou um relatório com a data inicial: ${startDate.toDate().toLocaleString()} e com data final de: ${endDate.toDate().toLocaleString()}`,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
    console.log(report); // Exibir o objeto de relatório no console para verificação
    return report; // Retorna o objeto do relatório
}

function gerarPDF(report, startDate, endDate) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configurações gerais
    doc.setFont('helvetica');
    doc.setFontSize(10);

    // Logo da empresa
    const logoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADL1t+KAAAAAXNSR0IArs4c6QAAIABJREFUeF7tnXmwZNdd38/du9/TyLaMIQRXKhRe2BJSBbY2G0iIJeMNSKWwTbBlmySATSKNNCJhCQk2AsexZCe2vCRFEILghZACs2gkm7DYki2FqqQqAQwS5B8gWHjGtmbe9HK3vN995/Scvu9239NveqTRuZ+ukt6b17dv39/n9zvne5bfOSdQvCAAAQhAAAIQeNITCJ70FmAABCAAAQhAAAIKQScIIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QQNA9cCImQAACEIAABBB0YgACEIAABCDgAQEE3QMnYgIEIAABCEAAQScGIAABCEAAAh4QGJygj0ajj4nfyrJUYRgG8lMpVev/Drk0CBaIArle/t38T6nmvyiK5DPNG1EUNX/Tr+aXoijk3vL74juqqmr+1nwwDM0XND/1vRfPUVVV87v5vP3Z5sHrWu5Vnj17tgrDsAyCoIzj+MPT6fRnLmJ8fmWWZXfMZrNoNBqFSqkoCATPgs/CDm1f84Z1jbG1Fnusl7Fn6e9r7KiFr/gwCILJfD7/TqXU2Q3tfpZS6j+YhwvDMDKGWL43vlr43sRAHMdif1BVlfFjbfla7GjcZPvNBIh8j35WsaOS/0ajkZpMJvlsNnu5UmrasuU3JGQk5uI4DmazWRDHsTCTyyrzHTomzEd/USm1tViI4/iFZVn+sP5O4dHgsuK4+V55FvkvSRKV53lR1/V3KKXmlj33CAd5VrmH2GO4y721LU1o6GJRR1H0wel0+p9tJnEcn1RKxZp54wPBanxnntMq36aINX4TllaZa9eHXfXjouzqe9dhGNbnzp2TsleVZVlFUXRbURQf3zAON7n8uXEcv7Msy3g0GjXxahiZOsHwk/iz66woiqQsNuXRlNd1X2xiSe6nfbyIcwm4+XxelGUplxVFUXy7UmrS4Z9E/KO/rwl/E/f6pzyL8ZkpHnJNExKta1c+rthq6hLjb/FRHMf1dDqVZy2jKCqLorhNKXUx/bOJL7d67aAE/ZnPfOb40b/8zN68yA/slv8vimc3V4k9UylI4dcNgEUFX2vBzdJMzeaz5u9xFEuFpKq66rt9c32apmo+t+u6g2eRIDeCbp5OV5DK/Gw/tTyjVDB5nr9QKXX/VqPl4GYvT9P0A/P5fNfc24iKFtaGl9Gq9vN3PY/hauxtc15nw0HLKlC1qk/VSn3Rhva+NAiCn6/r+qlNOGhfG7Zd/Nv3b18jLIqiaO4l79nx0vVsdnxZ3/u5qqquaF3/jCiKHjX3sz+3zuY0Tb9jPp//8oZcVl4ehuEtVVW93dVH2j+nKlXbvvniQKnPhEGoyvqgwbrqZSooKV91oL5tNpt9xFy7u7v7JXt7e3/pYpvxi/kpn3G1wb6/+YzxlfGD+anL3+k8z/+2UurPXZ5tw2telqbpL+R5fky+U8qXNAKl/miXNZcYMdpq7uUS8/bzmvIXBMFjZV09pR2zSqlHXey7UP8YW819VvlH7AvD8HRRFH9LKfUXLs/2ZLpmUIL+JU9/+pWfPXXqk+WBlEu/WqnzneVev0mQiFhJhS2FaDqdqlAdVNymJSy/F2WxuFdPe+HgMfTndWUgPZqlyibLMjWbzaSl2QiE1etYfI9uhS+eo67rU0qpL1dKnek1zPGCKIpeW1XVXdKbkmc0hcg8v/yUZ5TKxa44+25v96bshopL5ZLGicqLXL7iZK3Ut/Z9l3k/TdPvLoribukBiD/t57UbI+1eevv+4gu78pD7CJtNXkYk5KeulD9a1/V1rXtclWXZJyUO5Pnke7vioPUZCT+puH5/k+dZd20URR+I4/hV8hwuLyloSZyenBfzhW/G4/E108mkaWz2lY84bEbAVFmVdaLU186V+gPzveN4fM2kmHxCN807H8duYBle8jfhLLzF9+te8hlT1tsxbcdnR/l7SCn1ze0eqwuzVddI+VNK3SUx2xVj8gwm/lZ1ErrufSHlLwrCpuOyu3vZR8/unV2K2SRJrsrz/AEX/9gsbf+4lCXjHymH4k/j51X+0QzEP9/UMQp2IS56wj87KEH/G8985r/48z/7s7c2g+zNeFuo6nJ9D0Guk8IhQWKCywSK/L2Y59I7VGmSqnk+b3rnRtAv271MndlbPwJsC1i7pypCLhVPW+C7KhYplCL25h7ybFVVPVQUxZXbiLL9sa83V1X1o6Zwdo0UtHu2piGy7vtt+83vdo+/79klgNMkrcMo+reT6eSH+q7X7//4/qjwj5lrTYXQ7lW7NCiML2xb9ZB44zeXEYpW5VsfO3bsrWfOnPlh25YwDG+qquod9t8cepiil2ZY3xFN72UPK6VkmsLpFSoZag1+sjiIneaVJcnxsqzukDLl2kOPwqguqnLJlnE2vnkym7x9nWDI95m4sv0sf3doEC0+a7NeV/7seKiq6r15nr/RCVTPRftTQW+pqupH2uVvZ2dHnTt3rvl0u1dqOgDrbm03QE0MSzxKXdI3uiT31R2aOo6Tt07n06WYHWfZ8clsdrurf8bjsUw3mSmCRedk3fObRpntn3a5sMu1XT+WZfmesizftA3/XCr3GJSgX3Hs8ru+cOaxG0TQG8dWZW8XwQ4OUyHYFbAAjMKoqRykpSqv8WisJtODqaS+HogJhGPHjqkzZ84sel9mCKwpNLpHZnpwIhJS+KQnLIW4PVxviaTMW72vqqoLrVTeHUXRm6SAr+p57+7uqr29vcYcm5lrD7eZojiYA1uUjVXTCnbhMRVKlqX/cm8yeZtDwXpXlmU/YBpK9uiK+W67Yuy7X7uXZ3Po+6y8b/fs5FmSJBEAt84OKsLFK4qiO/eHL9+ocz+cGgpBEDxU1/VWGnTWo0iQN3PPeq57rZmBUvUoy26ZzGaLxkgURndWVdnEZF/5SPT0lVLBg2VdXmV/2SjL3judzb6vr8K3pynMNIjEsfze1wM000f2NJLczxa/deVvP6fjhFLqDpdYWHPNnfvTLY3vTdlq5wgYYTfxZBr4Lt8r95T/xI52T7lvBEMLSD3Kxj+oG1fny28U3ZmXB35e9WrXFW3/dE1Ftu9lT3eYmDT+6apD7PpxfwTzFqXUUkPZhdmles2gBP2LLn/qx89NJy84N58dDBdLddJXoyi1GHKzg2/Rmwx1w0ALuzhaGgpG1B1uvySSJhDNsK9O6lhUPF1zs6aBYQ8vmtauJIlEUfSGsizvOkIQjpVS/y2O4xdLwV7VY7UF0AicPKfLkKb9TO3ersuwvQzJynBsFMffXBTF766xMYvj+JfLsnyxMLV7NvIZYSjPbIaSNxmy7Lp21bymgw/q8Xj8wokekjbXx3F8T1EUL26J/MpelCQhBUGwjcac/ZUvUEr9rk5mczBFsiXDOh1lL5hMJjL02ryiIDhZ1fX1Mqo1yw/njtg3bjKjgrAOg+DDeVW+avm94GSt6uv7HkTPmy6G103Z6PucvC+flTi2R+faYtlV/kzjXyeVCbeF/S7fq6+RPJVfSpLkujzPm1yy9qiCbgQeKW7bzyF2Nv7RUxHN9GHPlIQMuYuNWTx64aQ4mEYxr0Cpe2qllmK2y/Zt+8c8t+Hl4J9rlVKf3MAvl+ylgxL0SKlaEnFyk4jjkBRnOhF20oXpTTaiJYk9VanspDjt7Yatq6CbzF752TWUKpVQM2evE63SNG3m0Yzgm0Ssyy67rOnpt17yGF+jlPrDDSJxJ47j3yqK4vl2K7ddSOR+Zs5LZ3Mvnt+MLKz7Tnskwup1OMelTsqR9MOdNfNhWRRFv1OW5ZWmQWSPBrSnBjR/F9c1IyRFUUi2tj3dUeueRa8ddu/CZMTXdT1qZYQLQlnFINn0qkuQ2pW9FvQTVVVdaO9w4b7RaPT6PM9/2sro7x22lh56rdSSb3ZG42oynTiVDylfenT8RKWWbYnDqCqqspdxu0I3xdKlwWiMb5W/wJ6vtaeapKF49uyhaTbJZ/m6DZPkdqMo+u9lWT7fbqib8tLONTGQRFzbiWHyXnukrN3Dl/g1nDZpsJkeeq1UppRaSh45on9MuWtWcEgG/br6wzRw7I6QlJEkSRZ5BnaHQ0bQVvhHck3+3wb14yV5aW9huCSf+ggPdcUVV1z+hdOnvyAflSH3prcpwr6+2pYh65uzLHtQyoQkgxmxlGA7NI/cJFeNgiSLrjq7t/e2KIyCQob117ysiliW+NyQ5/nDx44da2oxmU+SV2vYSJK4nheG4R1Ssdrz+fbwlOkhN/YeJNJJpfIVSqmGwbpXmqZfNZ/PPx7H8dNNC71rrr+VhCLPf7yu64fk71IBPvbYY11fsxRz+r5NBSm9kJ2dnX/82GOP3WB6C33zeDopbl2G+3OiKHqgLMunm4rNVAJ2pWb8ID9lmUtZlsejKHqwrutmSVDrP7lV+++N6MZxXE2n00J+RlF0w2w2+951rO2EQv1cp+p6KSNcXX755VdMJpPPCp9Vc7ldgh5F0QuKojhKz7DzkbMsu2U2m/07YeEyHSI3iYLwVFlXdob70wOl/koWfzYJlAcJjStfRjCe+rSnfdvnPve5X7UubO5TmwTXFXewR0+iKBK/ntgfcfqUXK6TIY1vzR3sGqF5T8q9NNokLmSZZFEUrw6C4PtkxV1f+TNDwHVd/4/90Y2/57KsMk3Tr5zP5/cHQXBFexqoYapX27SSZKWuOl5V1YN62qbK87ydINQMeNj/6XqssVliPQxDabTJf06JrTJCVlVVexWD3O6KQKnPbuIfWZ1TVdXxOI6FlTA3z2+W/DZLGNuulqWjrcTW71JKydx4E2PyXnsUraN+lCS5v6uUOkhIeJK+BiPox+LxNeeKyf3NUhlJbq8qFcaRqoq1gisB9GWbttx2x+MTk8n0bbWqm8XnfS/dutwogSmKonfphI7Gh/Zc7JrKVgrK89c9TxzH11ZV9RGzbMruxch9TZa/3UtM0/TUfD6XDFxZJ31Br93d3d/e29uT7FOn10EAB/fWqj40tJeo5Ko6rn+tKIpGzE1l2J6rN7kJep70VFVVNyilft3pAdZctC+oHyvL8lv67mMz1p95kf0ZnS28GBLsmvfvEvS6rr9kv2L7q77vd30/TdOT8/n8elcxF42IguDesq4XGe7ikziLHpjOpk49dJlDL8pCevl/zV4CNR6Pr5pOJg/0CYbxufzUvb0vVUp9xtXmVdfFcfygjF6Z9+3G4Qo+rvksVwdB8GsiiPYKCvkeMxLWHqUZjUanp9OplL8Ljtnd3d3f2dvb+0ZXPjrL/aO1Uocy3KuifKCsF/szrLylxLOexpA6cFv++ZRJCLZHJ+wRTfuBdPmRPJUfcLX9UrxuOIKejW+dzKZvk+CZVzq5RCfFdWVa60pzI5E1Dn7KsWNvfezMmR8UpXERdF3pPCRDwhsEiQzL/rZSau1n7Hlvabnnef4+Sa7q+p7RaPS62WzWbEKyKjmtnckeRdGpsixlDuqPNnj2lZcGQfCndV1/uS2y6+6bRHFd19VSFrVcn0TJa4syv8ulwpfr9fSA9I63boupjKWnYOwyNtmcZZg8y7Kfmk6nks28eEmGexAEd5TlwfCy8anpqbVzG47SQHTxXRAETYa7SRCzNj1qPt4x8lGncXrbvJj/K3P/RLL1a3VHVVeBJJP2jmAd5KYcynBPwvDGqlbv6BMMe6pMb/K0raz/NAzDv6iqatFYXMXQ8peMELxOKXX3ivL32tlsdpcMedurI+wGnxlatpLjTtd1LXP0m0ynrXT3/ijh/83z/G+6lj8JyKc+5Sk/9bkvfGEpw934uc8/ho228Uj17QpjsjAM/3wT/zQN0Ch6fVmWP+tSHi7FawYj6DtR9v5ZOfunTYV4MLyr4jRRZX6wbtEuNHp4Ruai7i2Kwnlt86LSiuLfLMpChtd659Ct5LEP7oviqzcMEtl85LN9y0Ls4SYZ1gqC4OVlWS615kej0Q3T6VQqk4ZHsyRPr+lcwUfE6ZGyLGWt7TY30GiyqF05yBztU44dO/H5M2cWc8W7o90bzk337kripHdIV75HV5KP6HWp29xsQobdzW6EnZsBteZxpUJ7g6w1tu3PsuzOoii+3wi63UBoc7LmQU/WVs/Ylee660RnZJi5fU17Ptb6d50l2S2z/HyGe5Zkd87z2feHQRi4bLw0zkZqOpse2mMgCqN3S6a8S4PNJEDqEYaNy/MaJs/WDdm18WrPgeskuS/W5XZx69Fo9JrpdHq3Xf5MIl5XT103Dv9El78/24Z/dWNRNoBzLn+ZLBkNo0MZ7sbPLv4xCYRZlp2czWZPmH80QymDWx3Z2pZvXO7j7DiXm13K1+zEyX2VUi+STUjsOXQZgjdZrCbxRfc0XIfIDpkdquB0reqnyQ5mbnvFqXp3d/fE3t7eURKYegXQDMdL73o2m0kr9HVlWS71EoIg+JQscTLLkfQQ2FKWbwef91dV9f3b8rsM9+8PUX9cRFB80Dd/3gjbQe9tKYs4UOpTgQqulFUMfSMkugKVnvF7ZrPZNofbvjmKot+ylxrJ80rSoiQ3trOHTa+6K8NdNs3Zz8JtsrmNOLQTJ1u9drHn/bPZbJu+uaYoik9kWSZbzppkwKVeeTsDW9qzcRwvzeMHSp3M0ux6s6tir3+Uqo9ddtn7Hzt7dsmWff/eE4Xhi/t6+PYcd1EU793CEs5FuCdJcmWe5zIVsrIeba+MkWH/qqq6st5lXv9KM6xuyp98Xn4388Ct9eHv0XPFWymCsq1vXde/Y3ID+jLc5UulQR3F8QuLoljKcE+j+GReFtf3+df4R+Jf/FP2LHPbxFAX/9ijWzpvR0ZRZMpBNix60r0GI+jxwZ5wgQh4Hemd3aKw6aHLy15Xq5O96jRND60HdvBwkwwiCXGS/d4X0KZVmGXZt9vbWjp8jySeXTuZTGRP4rV+tCsV6aGHYXhtURRLyzTCMGxa5nZymMmo3TKflabt7u6+fm9v76eNPauWydk30FnUS8OoaZw0PUnZ4KePv856Fya35Hm+zfWo3yvLxuzRDjOMaifqmOQj3RtbNeTY9PRNxW58JHEqFbzZpdAIqiR/1XW91Qx3SfAry1KmYzpjrT2Hb/V2lnwj6SsL/7pt/VrvjMcn9iaTpcZuqILKJUdFYqhJvpvPhe021oQvwq+PSSN4h5eadfq4r/zZIzkm+zuO45vzPH+nS13hcs1oNPqe6XT6nzYpf7JxUKVqWd66tHWg8XNf+bOWBUoZfFxjdgWTbQ77u2Df6jWDEPRMqefUKvx0HUgtUDU99OYV6H3Arc1MrELYuR64j/44jq+ZFkWzHaVLD93MHaVp+nXz+fx/992/9b5siiBNY0ucAAAgAElEQVQ7Za18deQHHArYLMuePZvN/kgf2LDUM+6qqE2vdkVvckMTzl8ex/GJsizfZpbNdPT4Dt07DuOHi6p4jnkjy7LnzGezP5L5WZcGlZleUUptde/7LMveVtf1rdLLsQ7IkMdsDmxpN1b0RiePzOfzhS3apqVhXTOk3pV4Je/JfafTaX3FFVdce/r06a2trd3PJH7z/ukbP7qzsxOYnckcHC1z7rZvnlvM8z+U+XPz2b4KX4/ALK0TNj5uYDo8xMWKV1kBI/va9zWozZCyPOr+lsPiY/Hp4pVl2VfMZrNHrOSwxXvtkRirPMrox6GGuQOOdZfcGobh27ric9WHQhX8SaXqpZ0DM5U9SyX1w7Jz5pPBP/aytjAMZRpxyT8XyPRx/fgwBD2KXlqW5a9KD73ZmlUdDOdKlrvsNGaGlkzh0fPHUvEuZda6eGacjW8pivzt0jt0SfqRe2ZZVs9ms42TddI0vW0+ny8lo3Q9o1QoMkwqAimJTXVdL4lGlmUvrarq1+wtZhcb5+hlH3LfbfBZxzCKovvKslxkeNsV4YrP1XEQfayoy0WG7bGdnZcVZfUROYms2WCiZ9mgvq9MeXzp3t7eBWc/W8/5DZKpLEOJMswqPhb9kd/18qfmUvld/j6dToMsy07t7e0tNep2dnZedu7cuY9ID91k59uJRGZqwqz5t9bl/q/5fG4y3KVXvKhbW6extdGaOmGxnEv74euVUksJYB2Z9XYypUztfLQsS3vjl5eFKviI9KzlS11yHGQE5jJ17IvPqDOSK2JeLw2UkkzwjQRDKfXXlVJOh7m4lPU0Te+dz+ftPfcPfdQW4SAI7qvr5RUZWZa9pKqqX+8qf12bFknZlNPPyrLc9lzvfUEQvKi9tnsdi1GS/eY0n/19+5pIqZdUOuO+T9BbMST+2dpacLMqY93z29+vf5fprW3O47uE0tauGYSgj7Pspnw2u0M6zSbLvekZyyEqOuI65iaPNPSSRNF/LMryn4wOknl6KxwdRLIGcpMMdxMA9+2fqLa0xKkdGWKvvKzh3vv2h9vbu2vdJNsfLm1p2xoq3BafdZGbZdkjs9lM1sq7vupxNj4xmZ0fjs2S7Pg8P79/dF+FoodkZSOYjRtUrg95IdfFcXxLURTN2m97208709z22+WXX96s/7c2+1laseAy6tH1vCYPo2kk6dPk2vdqVY4i6CeKolgMlT/18suPf+Gxx26XhDj5rFOOw8HGNEu+yZLspnk+u8NlnwexRZcBaaBv28eyt0P7VLwlfPZIjEx3yVr+yWTSntq5UcqfyU+QG7QTDdsjM/rk2a3ao5Ncm/K3YgqlHRpSvG5VSi1tU5wl2Y3zfPYO8XPvXv36JFWx54nwjz3Slaap7DEgpwluc+rtQor/xp8dhKAnKvxApapXymYWMqsdmNPRolDJOlfZkEUCWCpBM6dZluW97Za0C93xaPyb0+mkyXB3GXLXnYwPHSHDXb7CuULRgSvTCIcqlCRJPlAUxatMNrvp9elh4FV8tp5FLe0OezMIh5286iSKXp9by0xCFX4wTZNXStKVC38tkpdsq3xnZ+eXptPpP2jPkxs2q5LkNqiU14Z1V/KdEfX2B20REPFK0/QNsnLCXBcq9aEoir9zg9MIZR37fWWrRztK0g/M8nmzDWxfg83icK9y2IbUpYzra2QTlsIlI9xaP96ZkCrHEUv5Ex/LtXb5E6am5y7fa44oDsPwXtnGeIPndbl0qfw55LDIQUJvOHPmzNKqjCSMfqGq61e7rGIwD6VHLnq38XUxQl+ThGE4dzkcybqnhNPr90+pZNnaBqAf90vjKHqoKqvnSY8gahUYcxypqRjN+vMwDI+UwS3JLZKQ1V6ru8ZoabWfmDUjCBu9Ep2IsrZRZt7Up8DVWTJ63TSfLmW4y45oQRA8X3pe9u5v9qlL9pDuxdgnfH+J4NVlUdwfHezK1YBoH9zQCIZUeudPtDuUYRsF0UNVXT5Pn5HeW+HrBDLJfr4kT10KguB/KqX+zqqetV3ptgTV6QCXvogz92+tF24+Zs/5mt8rOcBHbwYziuMXTqzs50Cph+IkeZ4I1CqxOBjnP4haOSA2jZL3z8p8KcM9SZIH8zx/vmMvUuJIhqdX7r/Qx2DF+1fHcXy/7CC37vPN1mz6iNFABbLn+Qsmxfl97XWcPxQEwfNM+TPL1eykx47toN+7aj+Jo9gTK3VNHYSfsNeNt/M0mlEDWdKqT5YUF406zh2Q+kS2rN3wOcQ/W1uVoZS6JgzD+10F3eQyxXH8jbKaY8Nnv2QuH0QP3ayfNQHanpey14nqzG7pyd46mUyWhpIcvCZbXD6qt4p02jpRNnupqurby7L8iMP97UuuSZLkE7IdaF+FYgpgEieSkXpoiYnpGdtbStpLVjqGeptGyKSVebzh8y9dnjRZ1NXPBFG4WLctF7S3brSNjaO4zsuidaTmqJJdyEwl6tCDa4ZBZ9ZpYBdix7Y/u2rtd/t7bB/ZqxO28TxGrOWnyao3922PoujDcho9bg+VS+ZzoPejNw2C9shDW9BHEmeHG7uLfe377DMJcZJwaQ//933O4f3jLqeoSY6OdCR0A/MQE/09Sz3jtpB2bCAk9dNWy18chjeXVXW7pPLajUfj30XimAWmq/zZ9rgccGQ6UEfs1Kxz083tqYCui1sNyyNNszrEyuN2yRAE/VlhGD7cNfdnt4BbSUX1aDT6pul0KkvCnF/j8fiayWTSZLg7DBeb+x5pu0OdYdvb4DAViv6yrgrlOWEYfloaITL10LVXuAl6q4BuPcM2S5Kb5nl+h9mIwi5odoNrd7yj9s4dHNOqlHqkVmqRkZqq9KtyNf/9Zr5ZH2nbN4cnDSpZK22fBubs8It/4Vcqpf5gXRZ1az/95omMn7oO+dn0kbt60qbcNPPgeoWIbN7SnD2g/z3KRg9PZtNF8uWxY8eeO9k794dymIqZj7d3mlvsMrf8gF1rnJ8zHo8/PZlMnMuYzI3O5/Otri1O0/Qn5vP50o5+XWxNBSuHNxVFubQiQ1//nCAIPi2HiZjjkE0PXeLeXqpoTXVIzHY1zDd17+L6UZNgm/+w7Jthhv1NEqZd/i7b2VVn9xaHzyyVP32z58qudXJ4lMvRp/IZvYPlVleZuCYMy/ebJcuiE0VxfsXMkWE+gR/0XtCjKHqJ2RXNDNGZn2Z7Q/nZGuYVkb3c5SAF23cistIqNMs+zIY16/yrg3nj5JbRaPSTZVn+UN95zsbBupf+UN1KvpMM99ls9qtdJywJJ6m87XOS9UYXkjyy8QqAdRxkw5FABdfbG/EYMbEz7ks9HL8z3lFFkX9slueLpMCdnZ1X5LP5L4stsoGQvFx66LLfy6V4KEOWZS+fzWa/0rcsynC1xF0OymkOuzHJVS32DlgOPmEqO3kG8Yc9XG567nKNqbylAdmMENTV0v7eWZS9bF7OPmIabKsy5FsV0qGT2ky82kmC6+LKDKVu28dBEEiOTW+Gu97r3DzifbXeIMj8IYqil+nRuYXp7XqqPZWilz7K0aoHpzdt4RUodW+apNd1HWe7pvz95izPlzLcsyx7mZwFseq41/ajmtyei+Gf/SNrr3NJArUavpdsLo2ri70X9CRJbiqK4h1muFDAdPWeW9mop132AG5DHo1G75tOp83pWq7ze0qpIyXr6CSStRnuTes3ipu51KqupJL/r/M8/077ubMsOz6fz2+XHrqprOXZ7V3aDC/rmFHZPtYsg+uKtXVxtSQm5vhZ3eAIQn2SVMeoQPM9cmMzRxuF4a2FDBPq1zjLbpnq08CaDYTqunenviiKTpuT2FwLzeN1XZZlN89mTcb+ype9IZKOO1mVtnEDscemh5MkeZbER1fv38RCs9vXPG9ibdQaEg5VeFMcR3fIXhD22eLt/eBND//A10HXKV6yIuMOe0vdPn/EcXzaPqCn73qX98MwlEN81ma4m3jVRyvXURieKFrH2Y7H4+PT6XRl+TOdDtMwE14XI2YDnWArhVO+04xYmqQ8w2S5/MW3FlWxFJ9y7oA+srfz/PYutkmSnM7zvHdPfBe/mGv0GRO9/mnqyIPGb3OyZlVVW9uoZ5Pn3da13gu6Ukr2SH+lAJNANb0JO5vUHpqUCivPc1krunHGZZIkH8vz/FvMSWQOQ56S9fq+o2x3OBqNTk2n096AFQfL8LOsWw3D6ERRnV9GJEzCMPxQVVWNyEvhlTXHMnRqhlXNMF/XULyDfb1xaicNNT6y1r0vKpEgWJwDr0/fUqNsVIeBesOelUUdqOAXwyD4h80zy5JEtx76kRpUvYZt4QLbN323E9/p5Vkny7Lc5jraJpvbJHray6nshrEuN82Qu/imKMo35GW+yH7eHY0/cG46eZVpza1q8J5fBB9IMpnsMbDUaB2NRh8siuKVXUdidjHSz7jtnpc0mEqHLHDZmrjZ4Ejmm0MVvWJWzpr185bwNOXP9CTN3gurdgEUzkEQfHQ2m/WODvTFjP0YwcFZ5kE2GjVbE9svE1vSyDflbzwa14EK37A33VvKcA/D8INRFL1SGm0unZqL5J9YKTV3afSZ0Qc9UvoKpfc32IDdJXWp94IuZ+sWRfEN7crHLFUzPXdTkHQG909VVdU7P9b2ZBRFlTlAw1HsZC7sKMk6TYZ7aCUYrYoqfV64bOJRz4v825RS9pnS5oCVr7ATWOw5s0YU63qRlexSiW0S4dJDb0YE9AYw6yr8ptdQLY54luHYr7FPmQqUeiRQwVdIEpJjUly9s7Nz27lz5xangW3y7Bf72jiOHyqK4nmrvke4mTjTmwbJyMlWM/btvBDZh/7s2YP5U2u0ZinvQip8GSIoqrLtmwfDIHy+bCljEuFMbC2Jh/5HGIR1ksRvnR7eOEn2bHiei1iY+4Zh+BNVVW3Tx9fGcfwJs0JmXRxYDdY6SdOvmc/nS6eipWn6p/P5/Mu7eIqNZiltq3z+ZFEUG9dPq54zVvE1pSo+EUdxkJeFbCndNOptxibvwS5/kYq/sVDLGeFxHP9eVVVf75pdLs+k8xG26h+dMOxURK067WuVUpKD86R9eS/o+ki8Zgi5S7TEc62lOUfdU1iGjP7KZLjbPZk10SGC/k1FUWyUfKeUujaKoo/bp2+trPStIequCkUy3E3DoOsYWblve4rCnpd1maPqq/DM+/bOeu3lUotrzjcADiX4JVG8aFA1YtF/OMvW9/feck2w8uCddnyZbG7Zk37LG2PcHMfx26WHbk/DtBPbFv46yOruzHB3OU7YVEgi6Gma3DppTTlI1r/0vMxRtC4H+CilJLdla5uFyB7qRbE81Lyu/Ml7XUfA6s/0lr92/ZQkyVbPHRhn2fHpAeel45676jBpgMtLplXaqxjk7+0VRY7lYav+0VNVvVvymmezRiCe9Hr4pDegJ2Cu3k+MeKAvqFqCJRnu3zidTjdaiyjJOnmeN8ll7S06TcFokoWqqn2M5pcppTY6stNkuLv0UsTBen76UAGMVXxtoZrGxNo4kArFDL3bPXTHUYi1+A99sd45ym4oLPUU9N1Go9FDk+l0sbueWUcr+4TLEqGGtSzSs3bd6uAvb8vxr7/bFyNPwPtX6dh1KqNG0Nunm13oc6dpKr3BH+rrcdnLmsIgeqisS3vnw2uiILxf/GE2ddKV/2IqxTyntSqjHsXjF06KyeIUL713eROvLrFv2S6nmy2dBnYhXKRHWdf1j/QlpDaNYT3krpQ6lJAqa6X1qV5rfWzm0fVImXQ4lk6wuxBbDp4xfEtdqx+V32VViEl2bDeWGuGTEyTrSqbmlsqffgZZ+/0J2Wyn66yBNc8pGe4b1bfrbE7T9C3aP05lR+6VJMlDeZ4fZbfOC8W/1c87G7zVb338bvZal11/TG+jGfotm6NbdjbNINWt9reb3q4RvvY6artVqIfTNvZBFEVybKKcj91L0tw8iZOH5sVywLqcFiVfYEY2rHOLm73ht/FqLatbCLAR9PY6WH0+tozc/mKlcyPkOSKlboiT9Gfm+XyxZE0qHjMn314Tq4cz6zzPj+1vX7lYB7cNm7Z0j9dmWXaX7Enfdz9ryaU0UA6dfNX3+XXv7zcQPlZV1bfYgt4WU/PvpuEnp29V9S/KzozmvqNkdMMsn94lyWEypCtxa4Z1G9/pRMgmGUvOVjjIf5AG6JIt4uNSqZ/pWpGxygZdDuU+yxPDFwJFqXuDIHDKoBbnHbvsWH327N6HK1U1u9uZl+y9kK85wc6uK0wvsigK8fFI5ogvzITzn46D6GRZH+y5L+XFTCWIKAs/KevGR5neVCZQ6sN2+dN3k/pW5tQX2xT3PaO+r2Tsn+u7doP379k/DvrFLqOH8v3yKstScq1evcF3XJKX9lYWl+RTOz5UlmU39W0Y0u5lpml6ej6fb5xxORqNPjSdTpvkMpMlajbhWFpHvbu7mIfcb6HLXuwbJ9/t76p2b1EU17ls3KCzUuuyLD5UtQI2i+ObZ0WxdmiqY0VAM82txf1C46eWIbwm4UovMOtbT6W/sH7aU5964vTnP7/YXS9U6nh9sKd0c4n00ptRBUlI0ol2UinuLvM/3T5wxDG0Ho/LnDYuaYnr1u0Jw/BzdV0/deWIiYyH6JGnZiSqruvLdo+dOLN3ZuGbJEyO16q6vazKZkjX7r2Zhq+xQ5wn5yAURXEqLwvZqGnx2h2Pj+9NJrcbQXfppQdBcLqu643Lc4+DTwVBcIWxe921Jl5H2fiWyWx5D/ckDG/KD7LeV5Yju37S4vO5six7k2E3CVDJcM/S7AopJ2fP7a1NZrPK3y2nP//5pWmM8Xgs9W1jj87p6N2t8In2jzWdIRnuW5uW2YT/Nq+90Ap5m89yMe4lGcxO2aBWUtyR9nAPw/D3oij6+q5huK6Ty6SHMpvNJIHpjUcwvDm43KUFagpgoNTNlVJLSzLiILqvnUXc9Sz2XtT6hKltZlHLrHhpTuDqEnR7C1pjT5pl3ybr583zxkF0b63q66RXbhLi5D1bQOzGifCfTqdHWs1wBH9t/JEgCE4mSXK9y+YcppehlNp2hrt0X5rsZ2NA17yqvRGJCHqaZa+Yzc5nc0dBcG9V19fJckPpoctLZ+QvpnKMb0ZppmQf/jRJlvYYOGikqXtrXZ43mO7Z9ioGEdPPupY/abA2W88W+SvKVga1cCkd1rKL7SZpTjLcXda/bxBwYaCUOKXxsSl/4g+7p94sAa2qJilVtrBNovAVs7JcytjXS3Cvs0aMXB5j2/55mpxx4eofq1EoGe5LCcMuD3+pXeO1oLue3mUP6wZBIEeSNvNJG76aBCYzfG/uKT/tSlkP9TbrHvc3rjnhsn1k6zmuSJLklDQcXOapdBKL6OUrSrVcACUrvFaq93QzqxKXZ37Lfrn/1xuyWXl5rOKr66CS+dWlCqXrA/IcOitetnxdyqKOwujhqiqXzmUWAQmicB3/2/ZH27aZXbstLCJ0D1dVtWRP183NcjF9JOpP7Ocr/djWHqJjjrct6O3kuPRgNcVXK6U+bZ5jlGYPz+azA1t0jkQjHnpXOSPOZhWDCEaaZj85nU+XymESRQ8HUfQss0LFvscKm2W++bYtZ7hfrfcIbzba6cstMA3QWqklJrqB8nCtVK+PrSkJ2Uvitul0us2YvSpL0gdkqkqOs5Wsk3XZ+zIlIgfvtFcxiD1JkjyslHqWGZl04HMx/HNVGIYPyDy+w/fboxFSn8iujE/ql9eCbi8jW+UlM2xtkoqUUm/Q80CbOFa26GyWo8gWmOfOLU8HWVmUCxGW87HLstx4+0Y5xGR/uP0BFzHXlUZT7yUq/eq5mi8qWfljGifVvFi/F7zhowuHCLpkpG5t84VQhceVqm9f1UM3u5+ZHet0klFnFrUc19gk7OijaxvDdVKcWZ5ouAn/qqq2mi28ScD0XTsejyvZ3rTvOnlf96ZE07fqG6WU07C/eQYZ5do7e3ZlhrtZxdDuXdv/NlNEeVkcauzKircwipay7Xv4bP30rCRJGibmVEb7zIOuZ5F4lT0gKnV4sx+xx+yct8oO0zM3O95dhFUMN2VJeocIujxDO+ekXf70zncr96R37Rlrey+Gf5qNh2Snuq4NxLo4S10wm822vRmTS9Hd+jVOFcbWv/VxuOF4PL5qMpl80vWrrKGXbzpC1vPLZLjGtAhbItg8gi3q1jPJ9qmfcX1G3Qo+nud5Mz/pErCrBHB/eOzqQKkH+uasG+FPU7M1roigZAz3rhxwtSlU4Z1K1W90mUNvhKsoVBhED5Z1KVngzevYeHzNdJ7fL8lU1klssvZezfUWsB38xfSt2uJqc9914/H4atlb3sW/1gYkW7cnDMO3VFW1drTKXj/dxHkrmztR6qpCqU+aA4LMToByrZnmMjwkzqqilD0JDmW4S3meSnnWOxS65I/o+8oe7psuC13noiYh1U7qW3exLn8P1kot4rUpx/LvKP6kmYJYdQ874VAaBtuO2VCF/6VW1XeZRrA9RdXOURBfz2ezOgyCk2Vdv8R+5iRJrpKOhuTDmDrDYbpIvm6re+wrpe6UU+hc/aNtkL0NnvQZ7rr89VUvT873oyj67rIsf8716a0e6MYtNXu7w3bvo10orKzKIyUwSYZ7WZbOxwzqFtuhCiVS6jVBGN0tSWNrK6Tlndu2nkUdqOBepaw9sVcsWxNu0huSLOogDD5cVuczhqMoem1Vlj9rjt0UexYnXB3kaS1MtPjLHzf2tWs8XeB1zeoMlyFDq2En9sjqjK1lc0dRdF9ZLu/U1mWXNexep0nyoXmeL7KFR0nymlme3y2+aaafioOjU+WltzE9mJvVPpJ4lTXoZV0t+SZS6rsrpX7OeNKRzdZ9nCTJR/PW/uXrfC32ZEn6wWk+X8qgHiWj18zy6d0uDWpL1KVBvc2YfVeogjeZ0TFpdMle7l11mF6RI8MMH6iU+p6OOHtNFEU/u+nGWtsugzrHxylvSvymY/EXqqr6RxdYZi+Jj3vbQ1dK3RiG4TtkLsWVdJIkj+R5vji9y/VzYRj+glnyYA5mMRWW/DQFxBRM+bcc7lAUxYtdv8NcNxqN7ptOpy9yHXIXbQvD8D1VVf2A/V372cs3uuxbbDdI9htJj5RluTGfHhvX1mkdGdGHjjuVBpXORWj2ALDndRfro/WuamaI9Ki+3tRfR7le2yOx6/zxi2GPy5SVmVPXGd9dR9HeqDd1WVkOTQJW0xCrm9O+uk69+udRFL3TCEY7O36xrCrLFksqgyB4pK7rrcarzB+bPRkcE/OEiezJ356m6uXSdn4Yho9UVbUNe2Rr1PuDIGjOLDfTWXZZb4+eiN3S+62q6p+tCMoboyh6x4b+ebiu68WJfM7BvuZCeU6xQ+bxHRt9cjeZRtnaNOI27DjqPZzF7qhf8AR+7h6llJNgWsMzR1pGFkXRg2VZNoXDzg6V3yWozLGkUkGb+c6qqo6aXNZUKK6VfRzHcjJa19zqb+w/97e6rGW3+Gx7T2xZlvRXfTFihst1ApjY8/L97T9/3XxOMsLN3vv2MLW9XM308PVQreyhf++W9zzvM2OT90+GYXi9i4+tEYdt+0ayuU+5PLQRddkPez6ft/fDludauTRTnt9kUJvyUxRFV+ZzU56tbO+lLYntht9FjNcvUUr9pfkux2F/ibWXmxMfDc8oiu4py9KpfrLqlG34+CkS+3VdX2nHl7GlvVukXFOWpSTjyVTfv18TD5eCf5r6xNqfvTkdcN1L2y31STtj3yX0L7lrvBX0LMsens10Zu0a7FaGuyQVHWVfdbl7lWVZk4Sxt7d6HadVWGo5ZWkymawrIF1P/YwwDB/VvZjeYNU3kJb1tfuVajuf4I+VdZb4KkQ2n7Ist30akeyUtXYHr45ekNgjFavdEPjjLMue3cXfFvjWCIk0DBZtgsexZLZHJL5qf3Tnj1rf/3AURU22cN/LTBWFYXi8qqpN42nd7WXO1zkHRftJbPvSVl5Ik/m86ovsXqGxJUmSm/M8b/eY/jiKomebLZxNJrWUhVbiWPNVuqLeas9Ln0He7Cro2DuXZ5OEqy+WpW42gzAM/9i1t23FrSTSSiehGYlyeZnRKrlWn18vDYxFYuEqOyymUk5kCujne75vEbNmmamZSlnhH2n8iX+2FrNxHF9TFEVTn7j6R9v0jLZ/XNheitf4KuhyeMm8PX/d5QBrYwGZnzpKhrsMgYk4Lr2MkMj9zdI1a+hdGg9HSci6JgiC+82mDaaQ9gRWlwBGQRDo7bjWz+K1+LxOKXX3tgJZ5x6s3czB+FBWD0hrWy/3s+cRJYZF+ZZi2fRq9FDw4pHt0Q2X+NiWrSvu0zXHK3Y0tbVLpWTZcMM2fSNTVnqIey0Cw9MSdNs3so590WpadSPjK6n4p9Op9AZfl+e5HWeylWglDbC2P4398lNPZTVxogV920xuTtP0drNsrv0sG/i4Oa3NJf7M6JQZxVhaEaATBPti1P4euycu9zR74ht+9g6QQRCcquv6pUqpB3u+4yj+EUEX/zjnOfXZqZS6KU3Td2zinzRN5Tm2mZfg8JgX7xJfBb3p+bkUGEFrXXeUjNjXpGl6twSR9MClkKxax2k2XNAJJhtvL2sEcJMh94P9Zw4tmXHa496EneGj9wnf2p7YURS9uyzLN60L744EHRletze2uTJN00/Z/Jvz3/Vcukm2spmZpKyLV6zc7lzXddsW+aBk237qCLG71f2w93fQe9d+r2Up72KVVdamTG17euNMfGHmpM399Z7t9kqKq4Ig+KT40sSDWXlh/rZi+dhW93BPkuTOuq7f2LdUzeakp4PaGzHJWulPuvayu7jba/fXRZspB9IgltHDdkOxXZdYCXhy3rv4T0ZY+l5H9Y+MHG5txUySJO+u6/pNm/hHNmPab7Bsc6OsPlYX9X0vBX0T4WvtanQUHjdmWfZO07JtJ+eYFrb83cyll2V5pAz3MAybCsWIVHR8/a8AABDRSURBVHvJUFekdFUokhAnSSB6CG5tgFnCsvWMYbOFbV+Em6kKnfAiWf620NyYpuk7zRKZNn97hER4SWPL9PRcdtrre7YLeF94yhKotmhKMuc7TQa4y7D7xVhHm6bpyaIonObxhYHkalRVtZR8mSTJTXmeO22nKb4Rf8gITLsBOh6Pb5xMJs0Q/KpkUBOnsrWv+Hc2m209XiWRVXZpM+XOITG1SSTbz0VoJ5LdOB6P3ylHlPa9jODa+SD2ccZ9n28v37JzFsw9rTyMpnPTHCRT19K5cTqw4RLyzz11XS/yLFxyHMIwfPeaRL8+vJfc+0cRsEvOiI4HenMURc1uSi4Voq4MHnGZU25/VxAETRDZWaGWAC31FC0BPtJ2h0EQPBjH8fNlSNFlOLbZUCZJ3pPneVs03nyEHdKOxKcnWFxW7djr7Q9tbLNf4f2bqqp+bDQaBdPpwYotO7Nd/m1yDkzL3e7dPIGiLsJ1aA5x//jdHy+KYtPd3i6Gb5y2F7ZiWmKtPffdG2cdlW6XLT8ehuGPLZYuhuHiOGTdCOjqeW4rI3wRwnq0q/m36wiKDAO354nTNP3x+Xy+qY8X32k6CS49fHs3PikXpoy0s9it/QxkTbacQNjf2jhfuN8chuG/ugT8U5l18K7+0Z2/rc3jP9Hi6KWgp2l6z3w+d8ogNQIQBMF98/l844NS7OQWUzm1l6nZw1r6Pdmi8yjbNzYC2LU3/JpAuqW9vaxZq+ka9Dpb/0h81jyXHJixlCi0YoRhaR35eDx+wWRy/kjNKIpOVlV1vVRcXRv6yD1t0digd/V4lM2uIeHfkCFAiRN7ffaqh9EjTF1D9xfy/HLwiMyfOt3D6qkuDaFKmarr+kUuNzHTIF3TEHEcN41maZzbiY2msW6zMklgK6YzXB5l1TWS2PYZKQtmSsfxZl3Dyk1GuGv5s3vV9qiA6+fbIwkd9ZExRUaM1k6Bddl8RP8c6cyMNcwlse1Rq2Hi2uja6rC/Y0xctMu8FHQpeFmWPUMPg6+yUWqr5j1dyctWk3Ja16YvO92087vsSkCGjauqOsoWnV8dhuH/0evcm32KHeeKukTj0f2hpi/SLfyuZzY1efOebs3LMzsNn7oA1Et5fsVKZlupHvu91kDbKtfI7nqPWt8h2e72aVrGnvb95O+rvuPxLAcm7rqSFcWszwRB8AyT+KhFdZ2PpIG37S1sX55l2a+sOSLXfh6bqVSq9lI38ZP8zX4txZa8ocuHlAv5Z1fm86P7+RZfZC1vW+kvax2yNGS3Fq9Kqe8Iw/CXzD4TkmneU/6MnYcy3MXH+9Nnz7B62H3xZzPuu9al+Jlrmvvq+u9CzgH4TBRFTcz2jBpIvWXWiR+lDlxnW9s/rvVjO2Y34XfJXbvN4LjkjOOBIAABCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCCDoQ/E0dkIAAhCAgNcEEHSv3YtxEIAABCAwFAII+lA8jZ0QgAAEIOA1AQTda/diHAQgAAEIDIUAgj4UT2MnBCAAAQh4TQBB99q9GAcBCEAAAkMhgKAPxdPYCQEIQAACXhNA0L12L8ZBAAIQgMBQCPx/roy9AjDQAFcAAAAASUVORK5CYII=';
    doc.addImage(logoBase64, 'PNG', 10, 10, 40, 20);

    // Título e informações iniciais do relatório
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Mensal de Atividades', 60, 20);

    // Data do relatório
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const reportDate = `Período: ${startDate.toDate().toLocaleDateString()} - ${endDate.toDate().toLocaleDateString()}`;
    doc.text(reportDate, 60, 30);

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(10, 35, 200, 35);

    // Estatísticas de funcionários
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Funcionários Adicionados:', 20, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`${report.funcionariosAdicionados}`, 100, 45);

    // Atividades
    doc.setFont('helvetica', 'bold');
    doc.text('Atividades:', 20, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de atividades: ${report.atividadesTotal}`, 20, 65);
    doc.text(`Agendadas: ${report.atividadesAgendadas}`, 20, 75);
    doc.text(`Concluídas: ${report.atividadesConcluidas}`, 20, 85);
    doc.text(`Canceladas: ${report.atividadesCanceladas}`, 20, 95);

    // Leituras dos Sensores
    doc.setFont('helvetica', 'bold');
    doc.text('Leituras dos Sensores:', 20, 105);
    let yPosition = 115;

    // Limite de altura da página (margem inferior) para controle de quebra de página
    const pageHeight = doc.internal.pageSize.height;
    const marginBottom = 20;

    for (const sensorType in report.leiturasSensores) {
        const sensorData = report.leiturasSensores[sensorType];

        // Verificação se precisa de nova página
        if (yPosition + 40 > pageHeight - marginBottom) { // Ajuste o valor conforme necessário
            doc.addPage();
            yPosition = 20; // Reiniciar a posição vertical no topo da nova página
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Leituras dos Sensores (cont.):', 20, yPosition);
            yPosition += 10;
        }

        // Dados do sensor
        doc.setFont('helvetica', 'bold');
        doc.text(`${sensorType}:`, 20, yPosition);
        yPosition += 8;

        doc.setFont('helvetica', 'normal');
        doc.text(`Média: ${sensorData.media}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Mínimo: ${sensorData.minimo}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Máximo: ${sensorData.maximo}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Total de leituras: ${sensorData.totalLeituras}`, 20, yPosition);
        yPosition += 12; // Espaço entre diferentes sensores
    }

    // Rodapé do PDF
    if (yPosition + 10 > pageHeight - marginBottom) {
        doc.addPage();
        yPosition = 20;
    }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Relatório gerado pelo sistema da empresa MachinON', 20, yPosition);

    // Salvar o PDF
    doc.save('relatorio_mensal.pdf');
}


document.addEventListener("DOMContentLoaded", () => {
    const userData = JSON.parse(localStorage.getItem("userData"));
      const isAdmin = userData.isAdmin;

      if (isAdmin) {    
        document.getElementById("selectRelatorio").classList.remove("hidden");
      }

})