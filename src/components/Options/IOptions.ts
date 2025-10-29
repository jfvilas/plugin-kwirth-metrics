export interface IMetricsOptions {
    width: number
    depth: number
    interval: number
    chart: string
    aggregate: boolean
    merge: boolean
    stack: boolean
}

export interface IOptions {
    onChange: (options:IMetricsOptions) => void
    metricsOptions: IMetricsOptions
    disabled: boolean
    selectedNamespaces?: string[]
    selectedPodNames?: string[]
    selectedContainerNames?: string[]
}
