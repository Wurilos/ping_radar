import prisma from '../config/database';

const TARGET_CONTRACTS = new Set(['DR-08', 'DR-14']);
const NAME_PATTERN = /^\s*RD(\d{4})(?!\d)(?:\s*-\s*.*)?\s*$/i;

interface PlannedChange {
  id: string;
  contractNumber: string;
  currentName: string;
  nextName: string;
  host: string;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const equipments = await prisma.equipment.findMany({
    where: { contractNumber: { not: null } },
    select: {
      id: true,
      name: true,
      host: true,
      contractNumber: true,
    },
    orderBy: [{ contractNumber: 'asc' }, { name: 'asc' }],
  });

  const changes: PlannedChange[] = equipments.flatMap(equipment => {
    const contractNumber = String(equipment.contractNumber || '').trim().toUpperCase();
    if (!TARGET_CONTRACTS.has(contractNumber)) return [];

    const match = equipment.name.match(NAME_PATTERN);
    if (!match || equipment.name === match[1]) return [];

    return [{
      id: equipment.id,
      contractNumber,
      currentName: equipment.name,
      nextName: match[1],
      host: equipment.host,
    }];
  });

  if (changes.length === 0) {
    console.log('Nenhum equipamento dos contratos DR-08 e DR-14 precisa ser renomeado.');
    return;
  }

  console.log('');
  console.log(apply ? 'ALTERAÇÕES QUE SERÃO APLICADAS' : 'PRÉVIA — NENHUMA ALTERAÇÃO FOI GRAVADA');
  console.table(changes.map(change => ({
    contrato: change.contractNumber,
    atual: change.currentName,
    novo: change.nextName,
    host: change.host,
  })));

  if (!apply) {
    console.log('');
    console.log('Para aplicar, execute: npm run normalize:dr-names -- --apply');
    return;
  }

  await prisma.$transaction(
    changes.map(change => prisma.equipment.update({
      where: { id: change.id },
      data: { name: change.nextName },
    })),
  );

  const summary = changes.reduce<Record<string, number>>((result, change) => {
    result[change.contractNumber] = (result[change.contractNumber] || 0) + 1;
    return result;
  }, {});

  console.log('');
  console.log(`Renomeação concluída: ${changes.length} equipamento(s).`);
  for (const [contract, count] of Object.entries(summary)) {
    console.log(`- ${contract}: ${count}`);
  }
  console.log('IDs internos, IPs, históricos, alertas e vínculos contratuais foram preservados.');
}

main()
  .catch(error => {
    console.error('Falha ao normalizar os nomes dos equipamentos:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
