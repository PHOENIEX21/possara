export type ScreeningInput = { questionText: string; answerType: string; choices: string[] };
export function validateJobForm(form: {
  title: string; roleType: string; location: string; description: string;
  payMin: string; payMax: string; closesAt: string; requiresCbt: boolean;
  cbtMinutes: string; screening: ScreeningInput[];
}, publish: boolean, checkScreening = true) {
  if (![form.title, form.roleType, form.location].every(value => value.trim()))
    throw new Error("Enter a role title, role type and location.");
  const minimum = form.payMin.trim() ? Number(form.payMin) : null;
  const maximum = form.payMax.trim() ? Number(form.payMax) : null;
  if ([minimum, maximum].some(value => value !== null && (!Number.isFinite(value) || value < 0)))
    throw new Error("Pay amounts must be valid numbers of zero or more.");
  if (minimum !== null && maximum !== null && maximum < minimum)
    throw new Error("Maximum pay must be at least the minimum pay.");
  if (publish && !form.description.trim()) throw new Error("Add a role description before publishing.");
  if (form.closesAt) {
    const closing = new Date(`${form.closesAt}T23:59:59`).getTime();
    if (!Number.isFinite(closing) || publish && closing <= Date.now())
      throw new Error("Choose a future closing date before publishing.");
  }
  if (form.requiresCbt && (!Number.isInteger(Number(form.cbtMinutes)) || Number(form.cbtMinutes) < 1 || Number(form.cbtMinutes) > 180))
    throw new Error("Assessment duration must be a whole number between 1 and 180 minutes.");
  if (!checkScreening) return;
  if (form.screening.length > 50) throw new Error("Use at most 50 screening questions.");
  form.screening.forEach((question, index) => {
    if (!question.questionText.trim()) throw new Error(`Enter a title for screening question ${index + 1}, or remove it.`);
    const choices = question.choices.map(choice => choice.trim().toLowerCase());
    if (question.answerType === "single_choice" && (choices.length < 2 || choices.some(choice => !choice) || new Set(choices).size !== choices.length))
      throw new Error(`Screening question ${index + 1} needs at least two different, nonempty choices.`);
  });
}
