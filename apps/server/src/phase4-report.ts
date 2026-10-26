export type PilotReportRequest = {
  status: string;
  createdAt: Date;
  firstRespondedAt: Date | null;
  completedAt: Date | null;
  hasNextStep: boolean;
};

export type PilotReport = {
  period: { from: string; to: string };
  animals: {
    active: number;
    withIdentityRecords: number;
    identityCoveragePercent: number;
    withHealthEvent: number;
    healthEventCoveragePercent: number;
  };
  health: {
    events: number;
    eventsWithRequiredFields: number;
    requiredFieldCoveragePercent: number;
  };
  extension: {
    requests: number;
    completedRequests: number;
    completionPercent: number;
    requestsWithFirstResponse: number;
    averageHoursToFirstResponse: number | null;
    requestsWithNextStep: number;
    nextStepCoveragePercent: number;
    averageDaysToCompletion: number | null;
  };
};

function percentage(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
}

export function calculatePilotReport({
  from,
  to,
  activeAnimals,
  animalsWithIdentity,
  activeAnimalsWithHealthEvent,
  healthEventCount,
  requests,
}: {
  from: string;
  to: string;
  activeAnimals: number;
  animalsWithIdentity: number;
  activeAnimalsWithHealthEvent: number;
  healthEventCount: number;
  requests: PilotReportRequest[];
}): PilotReport {
  const completedRequests = requests.filter((request) => (
    request.status === "RESOLVED" || request.status === "CLOSED"
  )).length;
  const responseHours = requests.flatMap((request) => {
    if (!request.firstRespondedAt) return [];
    const hours = (request.firstRespondedAt.getTime() - request.createdAt.getTime()) / 3_600_000;
    return hours >= 0 ? [hours] : [];
  });
  const completionDays = requests.flatMap((request) => {
    if (!request.completedAt) return [];
    const days = (request.completedAt.getTime() - request.createdAt.getTime()) / 86_400_000;
    return days >= 0 ? [days] : [];
  });
  const requestsWithNextStep = requests.filter((request) => request.hasNextStep).length;

  return {
    period: { from, to },
    animals: {
      active: activeAnimals,
      withIdentityRecords: animalsWithIdentity,
      identityCoveragePercent: percentage(animalsWithIdentity, activeAnimals),
      withHealthEvent: activeAnimalsWithHealthEvent,
      healthEventCoveragePercent: percentage(activeAnimalsWithHealthEvent, activeAnimals),
    },
    health: {
      events: healthEventCount,
      eventsWithRequiredFields: healthEventCount,
      requiredFieldCoveragePercent: healthEventCount ? 100 : 0,
    },
    extension: {
      requests: requests.length,
      completedRequests,
      completionPercent: percentage(completedRequests, requests.length),
      requestsWithFirstResponse: responseHours.length,
      averageHoursToFirstResponse: average(responseHours),
      requestsWithNextStep,
      nextStepCoveragePercent: percentage(requestsWithNextStep, requests.length),
      averageDaysToCompletion: average(completionDays),
    },
  };
}
