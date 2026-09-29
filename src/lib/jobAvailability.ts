export function jobStatus(job: { status: string; closes_at: string | null }, now = Date.now()) {
  return job.status === "open" && job.closes_at !== null && !(Date.parse(job.closes_at) > now)
    ? "closed" : job.status;
}

export function isJobOpen(job: { status: string; closes_at: string | null }, now = Date.now()) {
  return jobStatus(job, now) === "open";
}
