import type { Difficulty, Equipment, MuscleGroup } from '@forja/core';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from './client';
import { exercises } from './schema';

type Seed = [name: string, muscle: MuscleGroup, equipment: Equipment, difficulty: Difficulty, instructions: string];

/**
 * Exercícios de DEMONSTRAÇÃO (is_demo = true, exibidos com selo "Demo").
 * Textos originais e genéricos; sem imagens/vídeos até haver conteúdo licenciado.
 */
const DEMO: Seed[] = [
  ['Supino reto com barra', 'chest', 'barbell', 'intermediate', 'Deite no banco, escápulas encaixadas, pés firmes. Desça a barra até a linha do peito com controle e empurre de volta sem tirar o quadril do banco.'],
  ['Supino inclinado com halteres', 'chest', 'dumbbell', 'beginner', 'Banco entre 30° e 45°. Desça os halteres ao lado do peito, cotovelos levemente abaixo da linha dos ombros, e suba aproximando-os.'],
  ['Crucifixo na máquina', 'chest', 'machine', 'beginner', 'Ajuste o banco para que as alças fiquem na altura do peito. Feche os braços em arco com cotovelos levemente flexionados.'],
  ['Crossover na polia', 'chest', 'cable', 'intermediate', 'Polias altas, um passo à frente. Traga as mãos para baixo e ao centro, contraia o peito e volte devagar.'],
  ['Flexão de braços', 'chest', 'bodyweight', 'beginner', 'Mãos um pouco além da largura dos ombros, corpo alinhado. Desça até quase encostar o peito e empurre o chão.'],
  ['Puxada frontal na polia', 'back', 'cable', 'beginner', 'Pegada aberta, tronco levemente inclinado. Puxe a barra até a parte alta do peito levando os cotovelos para baixo.'],
  ['Remada curvada com barra', 'back', 'barbell', 'intermediate', 'Quadril para trás, coluna neutra, tronco inclinado. Puxe a barra em direção ao umbigo e controle a descida.'],
  ['Remada unilateral com halter', 'back', 'dumbbell', 'beginner', 'Apoie mão e joelho no banco. Puxe o halter em direção ao quadril mantendo o tronco estável.'],
  ['Barra fixa', 'back', 'bodyweight', 'advanced', 'Pegada pronada, corpo estendido. Suba até o queixo passar a barra e desça até estender os braços.'],
  ['Remada baixa na polia', 'back', 'cable', 'beginner', 'Sente-se com joelhos levemente flexionados. Puxe o triângulo até o abdômen aproximando as escápulas.'],
  ['Desenvolvimento com halteres', 'shoulders', 'dumbbell', 'beginner', 'Sentado, halteres na altura das orelhas. Empurre para cima sem travar os cotovelos e desça com controle.'],
  ['Elevação lateral', 'shoulders', 'dumbbell', 'beginner', 'Cotovelos levemente flexionados. Eleve os braços lateralmente até a linha dos ombros e desça devagar.'],
  ['Face pull na polia', 'shoulders', 'cable', 'intermediate', 'Corda na altura do rosto. Puxe em direção à testa abrindo os cotovelos e girando os ombros para fora.'],
  ['Rosca direta com barra', 'biceps', 'barbell', 'beginner', 'Cotovelos junto ao corpo. Flexione os braços até a contração máxima sem balançar o tronco.'],
  ['Rosca alternada com halteres', 'biceps', 'dumbbell', 'beginner', 'Alterne os braços girando o punho durante a subida. Mantenha os cotovelos fixos.'],
  ['Rosca martelo', 'biceps', 'dumbbell', 'beginner', 'Pegada neutra (palmas voltadas uma para a outra). Suba e desça com controle.'],
  ['Tríceps na polia com corda', 'triceps', 'cable', 'beginner', 'Cotovelos colados ao corpo. Estenda os braços abrindo a corda no final do movimento.'],
  ['Tríceps francês com halter', 'triceps', 'dumbbell', 'intermediate', 'Halter acima da cabeça com as duas mãos. Desça atrás da cabeça e estenda os braços.'],
  ['Mergulho no banco', 'triceps', 'bodyweight', 'beginner', 'Mãos no banco atrás do corpo. Flexione os cotovelos até cerca de 90° e empurre de volta.'],
  ['Rosca de punho', 'forearms', 'dumbbell', 'beginner', 'Antebraços apoiados na coxa, punhos para fora. Flexione os punhos com amplitude completa.'],
  ['Agachamento livre', 'quads', 'barbell', 'intermediate', 'Barra apoiada no trapézio, pés na largura dos ombros. Desça com o quadril para trás e joelhos alinhados aos pés.'],
  ['Leg press 45°', 'quads', 'machine', 'beginner', 'Costas apoiadas, pés no centro da plataforma. Desça até ~90° de joelho e empurre sem travar.'],
  ['Cadeira extensora', 'quads', 'machine', 'beginner', 'Ajuste o encosto para o joelho alinhar ao eixo. Estenda as pernas e desça devagar.'],
  ['Afundo com halteres', 'quads', 'dumbbell', 'intermediate', 'Dê um passo à frente e desça até os dois joelhos formarem ~90°. Retorne empurrando com a perna da frente.'],
  ['Mesa flexora', 'hamstrings', 'machine', 'beginner', 'Deitado, rolo acima dos calcanhares. Flexione os joelhos sem tirar o quadril do banco.'],
  ['Levantamento terra romeno', 'hamstrings', 'barbell', 'intermediate', 'Joelhos levemente flexionados. Leve o quadril para trás descendo a barra rente às pernas, coluna neutra.'],
  ['Elevação pélvica', 'glutes', 'barbell', 'intermediate', 'Costas apoiadas no banco, barra sobre o quadril. Eleve o quadril até alinhar tronco e coxas.'],
  ['Abdução de quadril na máquina', 'glutes', 'machine', 'beginner', 'Sente-se com as costas apoiadas. Afaste as pernas contra a resistência e volte controlando.'],
  ['Panturrilha em pé', 'calves', 'machine', 'beginner', 'Pontas dos pés na plataforma. Suba o máximo possível, pause e desça alongando.'],
  ['Panturrilha sentado', 'calves', 'machine', 'beginner', 'Joelhos sob o apoio. Eleve os calcanhares e desça com amplitude completa.'],
  ['Prancha', 'abs', 'bodyweight', 'beginner', 'Antebraços no chão, corpo alinhado da cabeça aos pés. Mantenha o abdômen contraído pelo tempo definido.'],
  ['Abdominal na polia', 'abs', 'cable', 'intermediate', 'Ajoelhado, corda junto à cabeça. Flexione o tronco aproximando as costelas do quadril.'],
  ['Elevação de pernas', 'abs', 'bodyweight', 'intermediate', 'Deitado ou suspenso, eleve as pernas estendidas sem impulso e desça devagar.'],
  ['Kettlebell swing', 'full_body', 'kettlebell', 'intermediate', 'Movimento de quadril: empurre o quadril para frente para projetar o kettlebell até a altura do peito.'],
  ['Burpee', 'full_body', 'bodyweight', 'intermediate', 'Agache, apoie as mãos, estenda as pernas, volte e salte. Ritmo constante.'],
  ['Esteira', 'cardio', 'machine', 'beginner', 'Ajuste velocidade e inclinação conforme a orientação do seu treino. Registre o tempo nas observações.'],
  ['Bicicleta ergométrica', 'cardio', 'machine', 'beginner', 'Ajuste o banco à altura do quadril. Mantenha cadência estável.'],
  ['Remada com elástico', 'back', 'band', 'beginner', 'Prenda o elástico à frente na altura do peito. Puxe aproximando as escápulas.'],
];

/** Idempotente: só insere exercícios demo que ainda não existam (pelo nome). */
export async function seedDemoExercises(db: Db): Promise<number> {
  const existing = await db
    .select({ name: exercises.name })
    .from(exercises)
    .where(and(isNull(exercises.ownerId), eq(exercises.isDemo, true)));
  const names = new Set(existing.map((e) => e.name));
  const rows = DEMO.filter(([name]) => !names.has(name)).map(([name, muscleGroup, equipment, difficulty, instructions]) => ({
    name,
    muscleGroup,
    equipment,
    difficulty,
    instructions,
    description: '',
    isDemo: true,
    ownerId: null,
  }));
  if (rows.length) await db.insert(exercises).values(rows);
  return rows.length;
}
