function generateRandomGroup(): "unfamiliar" | "familiar" {
  return Math.random() < 0.5 ? "unfamiliar" : "familiar";
}

export async function GET() {
  const groups: string[] = [];
  for (let i = 0; i < 57; i++) {
    groups.push(generateRandomGroup());
  }
  const groupCounts = groups.reduce((acc, group) => {
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Response.json({ groupCounts, groups });
}
