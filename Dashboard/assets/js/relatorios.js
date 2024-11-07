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

document.addEventListener("DOMContentLoaded", () => {
    const userData = JSON.parse(localStorage.getItem("userData"));
      const isAdmin = userData.isAdmin;

      if (isAdmin) {    
        document.getElementById("selectRelatorio").classList.remove("hidden");
      }

})