
export type BuildStatusType = "queued" | "building" | "failed" | "succeeded";

export interface BuildStatus {
    id: string;
    type: BuildStatusType;
    startedTime: Date;
    finishedTime: Date | null;
}

export interface GetBuildStatusesOptions {
    ids?: string[];
}

export async function getBuildStatuses(options: GetBuildStatusesOptions): Promise<BuildStatus[]> {
    return [];
}