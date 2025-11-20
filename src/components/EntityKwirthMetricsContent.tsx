/*
Copyright 2025 Julio Fernandez

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React, { useRef, useState } from 'react'
import useAsync from 'react-use/esm/useAsync'

import { Progress, WarningPanel } from '@backstage/core-components'
import { alertApiRef, useApi } from '@backstage/core-plugin-api'
import { isKwirthAvailable, ClusterValidPods, PodData, IStatusLine, MetricDefinition, ANNOTATION_BACKSTAGE_KUBERNETES_LABELID, ANNOTATION_BACKSTAGE_KUBERNETES_LABELSELECTOR, IBackendInfo, getPodList, getContainerList } from '@jfvilas/plugin-kwirth-common'
import { MissingAnnotationEmptyState, useEntity } from '@backstage/plugin-catalog-react'

// kwirthMetrics
import { kwirthMetricsApiRef } from '../api'
import { accessKeySerialize, MetricsConfigModeEnum, MetricsMessage, InstanceMessageActionEnum, InstanceMessageFlowEnum, InstanceConfigScopeEnum, InstanceConfigViewEnum, IInstanceMessage, InstanceMessageTypeEnum, ISignalMessage, SignalMessageLevelEnum, InstanceConfigObjectEnum, InstanceConfig, InstanceMessageChannelEnum, OpsCommandEnum, IOpsMessageResponse, IOpsMessage, IRouteMessage } from '@jfvilas/kwirth-common'
import { ClusterList, ObjectSelector, ShowError, StatusLog, KwirthNews, ComponentNotFound, ErrorType } from '@jfvilas/plugin-kwirth-frontend'

// Material-UI
import { Box, Checkbox, FormControl, Grid, MenuItem, Select, Card, CardHeader, IconButton, Typography } from '@material-ui/core'

// Icons
import PlayIcon from '@material-ui/icons/PlayArrow'
import PauseIcon from '@material-ui/icons/Pause'
import StopIcon from '@material-ui/icons/Stop'
import InfoIcon from '@material-ui/icons/Info'
import WarningIcon from '@material-ui/icons/Warning'
import ErrorIcon from '@material-ui/icons/Error'
import RefreshIcon from '@material-ui/icons/Refresh'
import KwirthMetricsLogo from '../assets/kwirthmetrics-logo.svg'

import { IMetricsOptions } from './IOptions'
import { Options } from './Options'
import { Chart, IMetricViewConfig, METRICSCOLOURS } from './Chart'
import { ChartType } from './MenuChart'
import { VERSION } from '../version'

export interface IKwirthMetricsProps {
    allMetrics: boolean
    enableRestart: boolean
    width?: number
    depth?: number
    interval?: number
    chart?: ChartType
    hideVersion?: boolean
    excludeContainers?: string[]
    defaultMetrics?: string[]
}

export const EntityKwirthMetricsContent: React.FC<IKwirthMetricsProps> = (props:IKwirthMetricsProps) : JSX.Element => { 
    const kwirthMetricsApi = useApi(kwirthMetricsApiRef)
    const alertApi = useApi(alertApiRef)
    const { entity } = useEntity()
    const [validClusters, setValidClusters] = useState<ClusterValidPods[]>([])
    const [selectedClusterName, setSelectedClusterName] = useState('')
    const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([])
    const [selectedPodNames, setSelectedPodNames] = useState<string[]>([])
    const [selectedContainerNames, setSelectedContainerNames] = useState<string[]>([])
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(props.defaultMetrics? props.defaultMetrics : [])
    const [showError, setShowError] = useState('')
    const [started, setStarted] = useState(false)
    const [stopped, setStopped] = useState(true)
    const paused=useRef<boolean>(false)
    const [metricsMessages, setMetricsMessages] = useState<MetricsMessage[]>([])
    const [statusMessages, setStatusMessages] = useState<IStatusLine[]>([])
    const [websocket, setWebsocket] = useState<WebSocket>()
    const [instance, setInstance] = useState<string>()
    const kwirthMetricsOptionsRef = useRef<IMetricsOptions>({
        depth: props.depth !==undefined? props.depth : 10,
        width: props.width !==undefined? props.width : 3,
        interval: props.interval !==undefined? props.interval : 15,
        chart: props.chart !==undefined? props.chart : ChartType.AreaChart,
        aggregate:false,
        merge:false,
        stack:false
    })
    const [showStatusDialog, setShowStatusDialog] = useState(false)
    const [statusLevel, setStatusLevel] = useState<SignalMessageLevelEnum>(SignalMessageLevelEnum.INFO)
    const [backendVersion, setBackendVersion ] = useState<string>('')
    const [ backendInfo, setBackendInfo ] = useState<IBackendInfo>()
    const [_refresh,setRefresh] = useState(0)
    const [allMetrics, setAllMetrics] = useState<MetricDefinition[]>(
    [
        {metric:'kwirth_container_memory_percentage',help:'',eval:'',type:'counter'},
        {metric:'kwirth_container_cpu_percentage',help:'',eval:'',type:'counter'},
        {metric:'kwirth_container_transmit_percentage',help:'',eval:'',type:'counter'},
        {metric:'kwirth_container_receive_percentage',help:'',eval:'',type:'counter'},
        {metric:'kwirth_container_transmit_mbps',help:'',eval:'',type:'counter'},
        {metric:'kwirth_container_receive_mbps',help:'',eval:'',type:'counter'}
    ])
    const { loading, error } = useAsync ( async () => {
        if (backendVersion==='') setBackendVersion(await kwirthMetricsApi.getVersion())
        if (!backendInfo) setBackendInfo(await kwirthMetricsApi.getInfo())
        let reqScopes = [InstanceConfigScopeEnum.STREAM]
        if (props.enableRestart) reqScopes.push(InstanceConfigScopeEnum.RESTART)
        let data = await kwirthMetricsApi.requestAccess(entity,'metrics', reqScopes)
        setValidClusters(data)
    })

    const clickStart = () => {
        if (!paused.current) {
            setMetricsMessages([])
            setStarted(true)
            paused.current=false
            setStopped(false)
            startMetricsViewer()
        }
        else {
            paused.current=false
            setStarted(true)
        }
    }

    const clickPause = () => {
        setStarted(false)
        paused.current=true
    }

    const onClickStop = () => {
        setStarted(false)
        setStopped(true)
        paused.current=false
        stopMetricsViewer()
    }

    const onSelectCluster = async (clusterName:string|undefined) => {
        if (started) onClickStop()
        if (clusterName) {
            setSelectedClusterName(clusterName)
            setSelectedPodNames([])
            setSelectedContainerNames([])
            setStatusMessages([])
            let cluster = validClusters.find(cluster => cluster.name === clusterName)

            if (cluster && cluster.pods && cluster.metrics) {
                cluster.metrics.sort( (a,_b) => a.metric.startsWith('kwirth')? -1:1)
                setAllMetrics(cluster.metrics)

                let validNamespaces = Array.from(new Set(cluster.pods.map(pod => pod.namespace)))
                if (validNamespaces.length === 1) {
                    setSelectedNamespaces(validNamespaces)
                    let podList = getPodList (cluster.pods, validNamespaces)
                    setSelectedPodNames(podList.map(pod => pod.name))
                    setSelectedContainerNames(getContainerList(cluster.pods, validNamespaces, podList.map(pod => pod.name), props.excludeContainers || []))
                }
                else {
                    setSelectedNamespaces([])
                }
            }
        }
    }

    const processMetricsMessage = (wsEvent:any) => {
        let instanceMessage = JSON.parse(wsEvent.data) as IInstanceMessage
        switch (instanceMessage.type) {
            case InstanceMessageTypeEnum.DATA:
                let metricsMessage = instanceMessage as MetricsMessage
                if (metricsMessage.timestamp===0) {  // initial metrics values
                    metricsMessage.timestamp = Date.now()
                    setMetricsMessages([metricsMessage])
                }
                else {
                    setMetricsMessages((prev) => {
                        while (prev.length>kwirthMetricsOptionsRef.current.depth) {
                            prev.splice(0,1)
                        }
                        if (paused.current)
                            return prev
                        else
                            return [ ...prev, metricsMessage ]
                    })
                }
                break
            case InstanceMessageTypeEnum.SIGNAL:
                if (instanceMessage.flow === InstanceMessageFlowEnum.RESPONSE && instanceMessage.action === InstanceMessageActionEnum.START) {
                    if (instanceMessage.instance!=='')
                        setInstance(instanceMessage.instance)
                    else {
                        let signalMessage = instanceMessage as ISignalMessage
                        if (signalMessage.text) {
                            alertApi.post({ message: signalMessage.text, severity:'error', display:'transient' })
                        }
                    }
                }
                else {
                    let signalMessage = instanceMessage as ISignalMessage
                    if (signalMessage.text) {
                        addMessage(signalMessage.level, signalMessage.text)
                        switch(signalMessage.level) {
                            case SignalMessageLevelEnum.INFO:
                                alertApi.post({ message: signalMessage.text, severity:'info', display:'transient' })
                                break
                            case SignalMessageLevelEnum.WARNING:
                                alertApi.post({ message: signalMessage.text, severity:'warning', display:'transient' })
                                break
                            case SignalMessageLevelEnum.ERROR:
                                alertApi.post({ message: signalMessage.text, severity:'error', display:'transient' })
                                break
                            default:
                                alertApi.post({ message: signalMessage.text, severity:'success', display:'transient' })
                                break
                        }
                    }
                }
                break
            default:
                addMessage(SignalMessageLevelEnum.ERROR, 'Invalid message type received: ' + instanceMessage.type)
                alertApi.post({ message: 'Invalid message type received: ' + instanceMessage.type, severity:'error', display:'transient' })
                break
        }
    }
    
    const websocketOnChunk = (wsEvent:any) => {
        let instanceMessage:IInstanceMessage
        try {
            instanceMessage = JSON.parse(wsEvent.data) as IInstanceMessage
        }
        catch (err) {
            console.log(err)
            console.log(wsEvent.data)
            return
        }

        switch(instanceMessage.channel) {
            case InstanceMessageChannelEnum.METRICS:
                processMetricsMessage(wsEvent)
                break
            case InstanceMessageChannelEnum.OPS:
                let opsMessage = instanceMessage as IOpsMessageResponse
                if (opsMessage.data?.data) 
                    addMessage (SignalMessageLevelEnum.WARNING, 'Operations message: '+opsMessage.data.data)
                else
                    addMessage (SignalMessageLevelEnum.WARNING, 'Operations message: '+JSON.stringify(opsMessage))
                break
            default:
                console.log('Invalid channel in message: ', instanceMessage)
                break
        }

    }

    const websocketOnOpen = (ws:WebSocket) => {
        let cluster=validClusters.find(cluster => cluster.name===selectedClusterName)
        if (!cluster) {
            addMessage(SignalMessageLevelEnum.ERROR, 'Cluster not found')
            return
        }
        let pods = cluster.pods.filter(p => selectedNamespaces.includes(p.namespace))
        if (!pods || pods.length===0) {
            addMessage(SignalMessageLevelEnum.ERROR, 'Pod not found')
            return
        }

        console.log(`WS connected`)
        let accessKey = cluster.accessKeys.get(InstanceConfigScopeEnum.STREAM)
        if (accessKey) {
            let containers:string[] = []
            if (selectedContainerNames.length>0) {
                for(var p of selectedPodNames) {
                    for (var c of selectedContainerNames) {
                        containers.push(p+'+'+c)
                    }
                }
            }
            var iConfig:InstanceConfig = {
                channel: InstanceMessageChannelEnum.METRICS,
                objects: InstanceConfigObjectEnum.PODS,
                action: InstanceMessageActionEnum.START,
                flow: InstanceMessageFlowEnum.REQUEST,
                instance: '',
                accessKey: accessKeySerialize(accessKey),
                scope: InstanceConfigScopeEnum.STREAM,
                view: (selectedContainerNames.length > 0 ? InstanceConfigViewEnum.CONTAINER : InstanceConfigViewEnum.POD),
                namespace: selectedNamespaces.join(','),
                group: '',
                pod: selectedPodNames.join(','),
                container: containers.join(','),
                data: {
                    mode: MetricsConfigModeEnum.STREAM,
                    aggregate: kwirthMetricsOptionsRef.current.aggregate,
                    metrics: selectedMetrics,
                    interval: kwirthMetricsOptionsRef.current.interval
                },
                type: InstanceMessageTypeEnum.SIGNAL
            }
            ws.send(JSON.stringify(iConfig))
        }
        else {
            addMessage(SignalMessageLevelEnum.ERROR, 'AccessKey has not been obtained')
            return
        }
    }

    const startMetricsViewer = () => {
        let cluster=validClusters.find(cluster => cluster.name===selectedClusterName)
        if (!cluster) {
            addMessage(SignalMessageLevelEnum.ERROR, 'Cluster not found')
            return
        }

        try {
            let ws = new WebSocket(cluster.url)
            ws.onopen = () => websocketOnOpen(ws)
            ws.onmessage = (event) => websocketOnChunk(event)
            ws.onclose = (event) => websocketOnClose(event)
            setWebsocket(ws)
        }
        catch (err) {
            addMessage(SignalMessageLevelEnum.ERROR, 'Error starting websocket')
        }

    }

    const websocketOnClose = (_event:any) => {
      console.log(`WS disconnected from remote`)
      setStarted(false)
      paused.current=false
      setStopped(true)
    }

    const stopMetricsViewer = () => {
        websocket?.close()
    }

    const onChangeOptions = (options:IMetricsOptions) => {
        console.log('change')
        kwirthMetricsOptionsRef.current=options
        setRefresh(Math.random())
    }
 
    const actionButtons = () => {
        let hasStreamKey = false, hasRestartKey = false
        let cluster=validClusters.find(cluster => cluster.name===selectedClusterName)
        if (cluster) {
            hasStreamKey = Boolean(cluster.accessKeys.has(InstanceConfigScopeEnum.STREAM))
            hasRestartKey = Boolean(cluster.accessKeys.get(InstanceConfigScopeEnum.RESTART))
        }

        return <>
            { props.enableRestart &&
                <IconButton title='Restart' onClick={onClickRestart} disabled={selectedPodNames.length === 0 || !hasRestartKey || !websocket || !started}>
                    <RefreshIcon />
                </IconButton>
            }
            <IconButton onClick={clickStart} title="Play" disabled={started || !paused || selectedPodNames.length === 0 || selectedMetrics.length==0 || !hasStreamKey}>
                <PlayIcon />
            </IconButton>
            <IconButton onClick={clickPause} title="Pause" disabled={!((started && !paused.current) && selectedPodNames.length === 0)}>
                <PauseIcon />
            </IconButton>
            <IconButton onClick={onClickStop} title="Stop" disabled={stopped || selectedPodNames.length === 0}>
                <StopIcon />
            </IconButton>
        </>
    }

    const onMetricsChange = (event:any) => {
        setSelectedMetrics(event.target.value)
    }

    const statusButtons = (title:string) => {
        const show = (level:SignalMessageLevelEnum) => {
            setShowStatusDialog(true)
            setStatusLevel(level)
        }

        const prepareText = (txt:string|undefined) => {
            return txt? (txt.length>25? txt.substring(0,25)+"...":txt) : 'N/A'
        }

        return (
            <Grid container direction='row'>
                <Grid item>
                    <Typography variant='h5'>{prepareText(title)}</Typography>
                </Grid>
                <Grid item style={{marginTop:'-8px'}}>
                    <IconButton title="info" disabled={!statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.INFO)} onClick={() => show(SignalMessageLevelEnum.INFO)}>
                        <InfoIcon style={{ color:statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.INFO)?'blue':'#BDBDBD'}}/>
                    </IconButton>
                    <IconButton title="warning" disabled={!statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.WARNING)} onClick={() => show(SignalMessageLevelEnum.WARNING)} style={{marginLeft:'-16px'}}>
                        <WarningIcon style={{ color:statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.WARNING)?'gold':'#BDBDBD'}}/>
                    </IconButton>
                    <IconButton title="error" disabled={!statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.ERROR)} onClick={() => show(SignalMessageLevelEnum.ERROR)} style={{marginLeft:'-16px'}}>
                        <ErrorIcon style={{ color:statusMessages.some(m=>m.type=== InstanceMessageTypeEnum.SIGNAL && m.level=== SignalMessageLevelEnum.ERROR)?'red':'#BDBDBD'}}/>
                    </IconButton>
                </Grid>
            </Grid>
        )
    }

    const statusClear = (level: SignalMessageLevelEnum) => {
        setStatusMessages(statusMessages.filter(m=> m.level!==level))
        setShowStatusDialog(false)
    }

    const showMetrics = (options: IMetricsOptions) => {
        if (!metricsMessages || metricsMessages.length === 0) {
            if (selectedNamespaces.length === 0) 
                return <Typography>Select namespace chip on top.</Typography>
            else
                return <>
                    {started?<Typography>Waiting for first data, be patient...</Typography>:<Typography>Configure <b>chart options</b>, select some <b>metrics on top</b>, and <b>press PLAY</b> on top-right button to start viewing.</Typography>}
                </>
        }

        let cluster = validClusters.find(cluster => cluster.name === selectedClusterName)
        if (!cluster) return

        let data:Map<string, Map<string, { timestamp:string, value:number}[]>> = new Map()
        for (let metricsMessage of metricsMessages) {
            let ts = new Date(metricsMessage.timestamp)
            let timestamp = `${ts.getHours().toString().padStart(2,'0')}:${ts.getMinutes().toString().padStart(2,'0')}:${ts.getSeconds().toString().padStart(2,'0')}`
            for (var i=0;i<metricsMessage.assets.length;i++) {
                var assetName=metricsMessage.assets[i].assetName
                for (var metrics of metricsMessage.assets[i].values) {
                    if (!data.has(assetName)) data.set(assetName, new Map())
                    if (!data.get(assetName)?.has(metrics.metricName)) data.get(assetName)?.set(metrics.metricName,[])
                    data.get(assetName)?.get(metrics.metricName)?.push({timestamp, value:metrics.metricValue})
                }
            }   
        }

        let allCharts:any[] = []
        if (options.merge) {
            var assetNames=Array.from(data.keys())
            var firstAsset=assetNames[0]
            var allMetrics:string[] = Array.from(new Set(data.get(firstAsset)!.keys()))

            for (let metric of allMetrics) {
                let metricDefinition = cluster.metrics?.find(m => m.metric === metric)!
                let series = assetNames.map(assetName => {
                    return data.get(assetName)!.get(metric)!
                })
                allCharts.push(
                    <Chart key={metricDefinition.metric} metricDefinition={metricDefinition} names={assetNames} series={series} colour={''} chartType={options.chart} stack={options.stack} numSeries={series.length} tooltip={true} labels={true} viewConfig={{} as IMetricViewConfig}/>
                )
            }

            let rows = []
            for (let i = 0; i < allCharts.length; i += options.width) {
                rows.push(allCharts.slice(i, i + options.width))
            }
            return (<>
                {rows.map((row, index) => (
                    <div key={index} style={{ width:'100%', display: 'flex', justifyContent: 'space-around', gap:8, marginTop: 12 }}>
                        {row}
                    </div>
                ))}
            </>)
        }
        else {
            let allCharts = Array.from(data.keys()!).map( (asset, index)  =>  {
                return Array.from(data.get(asset)?.keys()!).map ( metric => {
                    var series = data.get(asset)?.get(metric)!
                    let metricDefinition = cluster.metrics?.find(m => m.metric === metric)!
                    return <Chart key={metricDefinition.metric} metricDefinition={metricDefinition} names={[asset]} series={[series]} colour={METRICSCOLOURS[index]} chartType={options.chart} stack={options.stack} numSeries={series.length} labels={true} tooltip={true} viewConfig={{} as IMetricViewConfig}/>
                })
            })

            // convert allResults (a list of charts) into a series of rows of charts
            let rows = []
            for (var resultAsset of allCharts) {
                for (let i = 0; i < resultAsset.length; i += options.width) {
                    rows.push(resultAsset.slice(i, i + options.width))
                }
            }
            return (<>
                {rows.map((row, index) => (
                    <div key={index} style={{ width:'100%', display: 'flex', justifyContent: 'space-around', gap:8, marginTop: 12 }}>
                        {row}
                    </div>
                ))}
            </>)
        }
    }

    const onSelectObject = (namespaces:string[], podNames:string[], containerNames:string[]) => {
        setSelectedNamespaces(namespaces)
        setSelectedPodNames(podNames)
        setSelectedContainerNames(containerNames)
    }

    const addMessage = (level:SignalMessageLevelEnum, text:string) => {
        setStatusMessages ((prev) => [...prev, {
            level,
            text,
            type: InstanceMessageTypeEnum.SIGNAL
        }])
    }

    const onClickRestart = () => {
        // we perform a route command from channel 'metrics' to channel 'ops'
        let cluster=validClusters.find(cluster => cluster.name===selectedClusterName)
        if (!cluster) {
            addMessage(SignalMessageLevelEnum.ERROR,'No cluster selected')
            return
        }
        let restartKey = cluster.accessKeys.get(InstanceConfigScopeEnum.RESTART)
        if (!restartKey) {
            addMessage(SignalMessageLevelEnum.ERROR,'No access key present')
            return
        }
        if (!instance) {
            addMessage(SignalMessageLevelEnum.ERROR,'No instance has been established')
            return
        }


        let pods:PodData[] = (cluster.pods as PodData[]).filter(pod => selectedNamespaces.includes(pod.namespace))
        for (let pod of pods) {
            let om:IOpsMessage = {
                msgtype: 'opsmessage',
                action: InstanceMessageActionEnum.COMMAND,
                flow: InstanceMessageFlowEnum.IMMEDIATE,
                type: InstanceMessageTypeEnum.DATA,
                channel: InstanceMessageChannelEnum.OPS,
                instance: '',
                id: '1',
                accessKey: accessKeySerialize(restartKey),
                command: OpsCommandEnum.RESTARTPOD,
                namespace: pod.namespace,
                group: '',
                pod: pod.name,
                container: ''
            }
            let rm: IRouteMessage = {
                msgtype: 'routemessage',
                accessKey: accessKeySerialize(restartKey),
                destChannel: InstanceMessageChannelEnum.OPS,
                action: InstanceMessageActionEnum.ROUTE,
                flow: InstanceMessageFlowEnum.IMMEDIATE,
                type: InstanceMessageTypeEnum.SIGNAL,
                channel: InstanceMessageChannelEnum.METRICS,
                instance: instance,
                data: om
            }
            websocket?.send(JSON.stringify(rm))
        }
    }

    return (<>
        { showError!=='' && <ShowError message={showError} onClose={() => setShowError('')}/> }

        { loading && <Progress/> }

        {!isKwirthAvailable(entity) && !loading && error && (
            <WarningPanel title={'An error has ocurred while obtaining data from kuebernetes clusters.'} message={error?.message} />
        )}

        {!isKwirthAvailable(entity) && !loading && (
            <MissingAnnotationEmptyState readMoreUrl='https://github.com/jfvilas/kwirth' annotation={[ANNOTATION_BACKSTAGE_KUBERNETES_LABELID, ANNOTATION_BACKSTAGE_KUBERNETES_LABELSELECTOR]}/>
        )}

        { isKwirthAvailable(entity) && !loading && validClusters && validClusters.length===0 &&
            <ComponentNotFound error={ErrorType.NO_CLUSTERS} entity={entity}/>
        }

        { isKwirthAvailable(entity) && !loading && validClusters && validClusters.length>0 && validClusters.reduce((sum,cluster) => sum+cluster.pods.length, 0)===0 &&
            <ComponentNotFound error={ErrorType.NO_PODS} entity={entity}/>
        }

        { isKwirthAvailable(entity) && !loading && validClusters && validClusters.length>0 && validClusters.reduce((sum,cluster) => sum+cluster.pods.length, 0)>0 &&
            <Box sx={{ display: 'flex'}}>
                <Box sx={{ width: '200px', maxWidth:'200px'}}>
                    <Grid container direction='column'>
                        <Grid item>
                            <Card>
                                <ClusterList resources={validClusters} selectedClusterName={selectedClusterName} onSelect={onSelectCluster}/>
                            </Card>
                        </Grid>
                        <Grid item>
                            <Card>
                                <Options metricsOptions={kwirthMetricsOptionsRef.current!} selectedNamespaces={selectedNamespaces} selectedPodNames={selectedPodNames} selectedContainerNames={selectedContainerNames} onChange={onChangeOptions} disabled={selectedNamespaces.length === 0 || paused.current}/>
                            </Card>
                        </Grid>
                        {!props.hideVersion &&
                            <Grid item>
                                <Card>
                                    <KwirthNews latestVersions={backendInfo} backendVersion={backendVersion} ownVersion={VERSION}/>
                                </Card>
                            </Grid>
                        }
                    </Grid>
                </Box>

                <Box sx={{ flexGrow: 1, p:1, marginLeft:'8px' }}>

                    { !selectedClusterName && 
                        <img src={KwirthMetricsLogo} alt="No cluster selected" style={{ left:'40%', marginTop:'10%', width:'20%', position:'relative' }} />
                    }

                    { selectedClusterName && <>
                        <Card style={{marginTop:-8, marginBottom:8}}>
                            <CardHeader title={statusButtons(selectedClusterName)} style={{marginTop:-4, marginBottom:4, flexShrink:0}} action={actionButtons()} />
                            
                            <Grid container style={{alignItems:'end'}}>
                                <Grid item style={{width:'66%'}}>
                                    <Typography style={{marginLeft:14}}>
                                        <ObjectSelector cluster={validClusters.find(cluster => cluster.name === selectedClusterName)!} onSelect={onSelectObject} disabled={selectedClusterName === '' || started || paused.current} selectedNamespaces={selectedNamespaces} selectedPodNames={selectedPodNames} selectedContainerNames={selectedContainerNames} scope={InstanceConfigScopeEnum.STREAM} excludeCotainers={props.excludeContainers}/>
                                    </Typography>
                                </Grid>
                                <Grid item style={{width:'33%', marginLeft:0, marginBottom:6, maxWidth:'33%' }}>
                                    <FormControl style={{width:'100%'}}>
                                        <Select value={selectedMetrics} MenuProps={{variant:'menu'}} multiple onChange={onMetricsChange} renderValue={(selected) => (selected as string[]).join(', ').substring(0,40)+'...'} disabled={selectedClusterName === '' || selectedNamespaces.length === 0  || started}>
                                            {
                                                allMetrics.map(m => 
                                                    <MenuItem key={m.metric} value={m.metric} style={{marginTop:'-8px', marginBottom:'-8px'}}>
                                                        <Checkbox checked={selectedMetrics.includes(m.metric)} style={{marginTop:'-8px', marginBottom:'-8px'}}/>
                                                        <Typography style={{marginTop:'-8px', marginBottom:'-8px'}}>{m.metric}</Typography>
                                                    </MenuItem>
                                                )
                                            }
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </Card>
                        { showMetrics(kwirthMetricsOptionsRef.current) }
                    </>}


                </Box>                
            </Box>
        }

        { showStatusDialog && <StatusLog level={statusLevel} onClose={() => setShowStatusDialog(false)} statusMessages={statusMessages} onClear={statusClear}/>}
    </>)
}
