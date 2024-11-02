
async function getSensorStatistics(empresaId, startDate, endDate) {
    const sensoresRef = db.collection(`empresas/${empresaId}/sensores`);
    const snapshot = await sensoresRef.get();

    // Criar um objeto para armazenar estatísticas por tipo de sensor
    const statsByType = {};

    for (const sensorDoc of snapshot.docs) {
        const sensorId = sensorDoc.id;
        const sensorData = sensorDoc.data();
        const sensorType = sensorData.tipo; // Tipo do sensor (ex: Temperatura, Nível, etc.)

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

        // Calcular as estatísticas para as leituras do sensor
        readingsSnapshot.forEach(readingDoc => {
            const leitura = readingDoc.data().valor;
            stats.count++;
            stats.average += leitura;
            stats.min = Math.min(stats.min, leitura);
            stats.max = Math.max(stats.max, leitura);
        });

        // Calcule a média se houver leituras
        if (stats.count > 0) {
            stats.average /= stats.count;
        } else {
            stats.min = null; // Não há leituras
            stats.max = null;
        }

        // Adiciona as estatísticas ao objeto por tipo de sensor
        statsByType[sensorType] = statsByType[sensorType] || {
            average: 0,
            min: Infinity,
            max: -Infinity,
            count: 0
        };

        // Atualiza as estatísticas para o tipo do sensor
        if (stats.count > 0) {
            statsByType[sensorType].count += stats.count;
            statsByType[sensorType].average += stats.average * stats.count; // Total para calcular a média global
            statsByType[sensorType].min = Math.min(statsByType[sensorType].min, stats.min);
            statsByType[sensorType].max = Math.max(statsByType[sensorType].max, stats.max);
        }
    }

    // Calcular média global para cada tipo de sensor
    for (const sensorType in statsByType) {
        const totalCount = statsByType[sensorType].count;
        if (totalCount > 0) {
            statsByType[sensorType].average /= totalCount; // média final
        } else {
            statsByType[sensorType].average = null; // Não há leituras
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
        concluídas: 0
    };

    snapshot.forEach(doc => {
        report.total++;
        const atividade = doc.data();
        if (atividade.status === 'Agendada') {
            report.agendadas++;
        } else if (atividade.status === 'Concluída') {
            report.concluídas++;
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


async function gerarRelatorioMensal(empresaId) {
    const numFuncionarios = await countFuncionarios(empresaId, startDate, endDate);
    const atividadesReport = await countAtividades(empresaId, startDate, endDate);
    const sensorStats = await getSensorStatistics(empresaId, startDate, endDate);

    const report = `
        Relatório Quinzenal:
        --------------------------------
        Funcionários Adicionados: ${numFuncionarios}
        Atividades Total: ${atividadesReport.total}
        Atividades Agendadas: ${atividadesReport.agendadas}
        Atividades Concluídas: ${atividadesReport.concluídas}
        Leituras de Sensores:
            Média: ${sensorStats.average}
            Mínimo: ${sensorStats.min}
            Máximo: ${sensorStats.max}
    `;

    console.log(report);
    return report; // Retorna o relatório para uso posterior
}
