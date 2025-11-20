import React, { useState } from 'react'
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from 'recharts'
import { Tooltip as MUITooltip, IconButton } from '@mui/material'
import { MenuChart, MenuChartOption } from './MenuChart'
import { MoreVert } from '@material-ui/icons'
import { TreemapNode } from 'recharts/types/util/types'
import { MetricDefinition } from '@jfvilas/plugin-kwirth-common'

export interface IMetricViewConfig {
    displayName: string
    chartType: ChartType
    tooltip: boolean
    labels: boolean
    stack: boolean
}

enum ChartType {
    LineChart='line',
    BarChart='bar',
    AreaChart='area',
    ValueChart='value',
    PieChart='pie',
    TreemapChart='treemap',
}

export interface ISample {
    timestamp:string
    value:number
}

export const METRICSCOLOURS = [
    "#6e5bb8", // morado oscuro
    "#4a9076", // verde oscuro
    "#b56c52", // naranja oscuro
    "#7f6b97", // color lavanda oscuro
    "#b0528f", // rosa oscuro
    "#b0b052", // amarillo oscuro
    "#b05252", // rojo oscuro
    "#5285b0", // azul oscuro
    "#a38ad6", // morado pastel
    "#89c1a0", // verde pastel
    "#e4a28a", // naranja pastel
    "#b09dbd", // lavanda pastel
    "#e2a4c6", // rosa pastel
    "#c5c89e", // amarillo pastel
    "#e2a4a4", // rojo pastel
    "#90b7e2", // azul pastel
    "#f8d5e1", // rosa claro pastel
    "#b2d7f0", // azul muy claro pastel
    "#f7e1b5", // amarillo muy claro pastel
    "#d0f0c0", // verde muy claro pastel
    "#f5b0a1", // coral pastel
    "#d8a7db", // lavanda muy claro pastel
    "#f4c2c2", // rosa suave pastel
    "#e6c7b9", // marron claro pastel
    "#f0e2b6", // crema pastel
    "#a7c7e7", // azul palido pastel
    "#f5e6a5", // amarillo palido pastel
    "#e3c8f5", // lilas pastel
    "#d0c4e8", // lila palido pastel
    "#b8d8b8", // verde claro pastel
    "#d2ebfa", // azul muy claro pastel
    "#f1c1d2"  // rosa bebe pastel
]

export interface IChartProps {
    metricDefinition: MetricDefinition,
    names: string[],
    series: ISample[][],
    colour: string,
    chartType: ChartType,
    stack: boolean
    tooltip: boolean
    labels: boolean
    numSeries: number
    viewConfig : IMetricViewConfig
    onSetDefault?: (name:string, mvc: IMetricViewConfig) => void
}

export const Chart: React.FC<IChartProps> = (props:IChartProps) => {
    const [anchorMenuChart, setAnchorMenuChart] = useState<null | HTMLElement>(null)
    const [chartType, setChartType] = useState<ChartType>(props.viewConfig?.chartType? props.viewConfig.chartType : props.chartType)
    const [stack, setStack] = useState<boolean>(props.viewConfig?.stack? props.viewConfig.stack : props.stack)
    const [tooltip, setTooltip] = useState<boolean>(props.viewConfig?.tooltip? props.viewConfig.tooltip : props.tooltip)
    const [labels, setLabels] = useState<boolean>(props.viewConfig?.labels? props.viewConfig.labels : props.labels)

    let result
    let height=300
    let  dataSummarized:any[]

    const mergeSeries = (names:string[], series:ISample[][]) => {
        // names is an array of names of series
        // series is an array of arrays of samples
        // example:
        //   [default, ingress-nginx]
        //   [  [ {timestamp:'dad',value:1}, {timestamp:'dad',value:2} ], [ {timestamp:'dad',value:4}, {timestamp:'dad',value:0} ]  ]
        if (!names || names.length===0) return []
        let resultSeries = []

        for (var i=0; i<series[0].length; i++) {
            var item: { [key: string]: string|number } = {}
            for (var j=0; j<series.length; j++ ) {
                if (series[j][i]) {
                    item['timestamp'] = series[0][i].timestamp
                    item[names[j]] = series[j][i].value
                }
            }
            resultSeries.push(item)
        }

        // result is:
        // [ 
        //   {timestamp: '09:16:27', default: 0.21, ingress-nginx: 0.93}
        //   {timestamp: '09:16:32', default: 0.5, ingress-nginx: 0.04}
        // ]
        return resultSeries
    }

    const CustomizedContent: React.FC<TreemapNode> = (props) => {
        const { root, depth, x, y, width, height, index, name } = props

        return (
            <g>
                <rect x={x} y={y} width={width} height={height}
                    style={{
                        fill: depth < 2 ? METRICSCOLOURS[Math.floor((index / root.children.length) * 6)] : '#ffffff00',
                        stroke: '#fff',
                        strokeWidth: 2 / (depth + 1e-10),
                        strokeOpacity: 1 / (depth + 1e-10),
                    }}
                />
                {depth === 1 ? (
                    <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={14} fontFamily='Roboto, Helvetica, Arial, sans-serif'>
                    {name}
                    </text>
                ) : null}

            </g>
        )
    }

    const menuChartOptionSelected = (opt:MenuChartOption, data:any) => {
        setAnchorMenuChart(null)
        switch (opt) {
            case MenuChartOption.Stack:
                setStack(!stack)
                break
            case MenuChartOption.Remove:
                //+++ pending implementation on parent
                break
            case MenuChartOption.Export:
                if (!props.names?.length || !props.series?.length) return

                const headers = ["timestamp", ...props.names]
                const timestamps = props.series[0].map(point => point.timestamp)
                const rows = timestamps.map((timestamp, idx) => {
                    const values = props.series.map(serie => serie[idx]?.value ?? "")
                    return [timestamp, ...values];
                })
                const separator = ",";
                const csvContent = headers.join(separator) + "\n" + rows.map(r => r.join(separator)).join("\n")
                const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
                
                const link = document.createElement("a")
                link.href = URL.createObjectURL(blob)
                link.download = `${props.metricDefinition.metric}.csv`
                link.click()
                break
            case MenuChartOption.Tooltip:
                setTooltip(!tooltip)
                break
            case MenuChartOption.Labels:
                setLabels(!labels)
                break
            case MenuChartOption.Default:
                if (props.onSetDefault) {
                    props.onSetDefault(props.metricDefinition.metric, {
                        displayName: props.metricDefinition.metric,
                        chartType: chartType,
                        stack: stack,
                        tooltip: tooltip,
                        labels: labels
                    })
                }
                break
            default:
                setChartType(data as ChartType)
                break
        } 
    }

    const renderLabel = (data:any) => {
        var values:any[] = props.series.map (s => s[data.index])
        var total:number = values.reduce((acc,value) => acc+value.value, 0)
        return <text x={data.x + data.width/3.5} y={data.y-10}>{total.toPrecision(3).replace(/0+$/, '').replace(/\.+$/, '')}</text>
    }

    switch (chartType) {
        case ChartType.ValueChart:
            result = (
                <div style={{padding:'30px', height:height*0.8, alignItems:'center', justifyContent:'center', display:'flex'}}>
                <Stack direction={'row'} alignItems={'center'} justifyContent={'center'} spacing={2} sx={{ flexWrap: 'wrap'}}>
                    { props.series.map( (serie,index) => {
                        let value = serie[serie.length-1].value
                        if (!value) return //+++
                        let valueStr = value.toString()
                        if (value) {
                            valueStr = value.toFixed(3)
                            if (value>10) valueStr=value.toFixed(2)
                            if (value>100) valueStr=value.toFixed(1)
                            if (value>1000) valueStr=value.toFixed(0)
                        }
                        return (
                            <Stack key={index} direction={'column'}>
                                <Typography mt={2} textAlign={'center'} width={'100%'} fontSize={Math.min(48, 192/props.series.length)} color={props.series.length===1?props.colour:METRICSCOLOURS[index]}>
                                    {valueStr}
                                </Typography>
                                <Typography textAlign={'center'} width={'100%'} fontSize={12} color={props.series.length===1?props.colour:METRICSCOLOURS[index]}>
                                    {props.names[index]}
                                </Typography>
                            </Stack>
                        )
                    })}
                </Stack>
                </div>
            )
            break
        case ChartType.LineChart:
            result = (
                <LineChart data={mergeSeries(props.names, props.series)}>
                    <CartesianGrid strokeDasharray='3 3'/>
                    <XAxis dataKey='timestamp' fontSize={8}/>
                    <YAxis/>
                    { tooltip && <Tooltip /> }
                    <Legend/>
                    { props.series.map ((_serie,index) => <Line key={index} name={props.names[index]} type='monotone' dataKey={props.names[index]} stroke={props.series.length===1?props.colour:METRICSCOLOURS[index]} activeDot={{ r: 8 }} />) }
                </LineChart>
            )
            break
        case ChartType.AreaChart:
            result = (
                <AreaChart data={mergeSeries(props.names, props.series)}>
                    <defs>
                        {
                            props.series.map( (_serie,index) => {
                                return (
                                    <linearGradient key={index} id={`color${props.series.length===1?props.colour:METRICSCOLOURS[index]}`} x1='0' y1='0' x2='0' y2='1'>
                                        <stop offset='7%' stopColor={props.series.length===1?props.colour:METRICSCOLOURS[index]} stopOpacity={0.8}/>
                                        <stop offset='93%' stopColor={props.series.length===1?props.colour:METRICSCOLOURS[index]} stopOpacity={0}/>
                                    </linearGradient>
                                )
                            })
                        }
                    </defs>
                    <CartesianGrid strokeDasharray='3 3'/>
                    <XAxis dataKey='timestamp' fontSize={8}/>
                    <YAxis />
                    { tooltip && <Tooltip /> }
                    <Legend/>
                    { props.series.map ((_serie,index) => 
                        <Area key={index} name={props.names[index]} type='monotone' {...(stack? {stackId:'1'}:{})} dataKey={props.names[index]} stroke={props.series.length===1?props.colour:METRICSCOLOURS[index]} fill={`url(#color${props.series.length===1?props.colour:METRICSCOLOURS[index]})`}/> )
                    }
                </AreaChart>
            )
            break
        case ChartType.BarChart:
            result = (
                <BarChart data={mergeSeries(props.names, props.series)}>
                    <CartesianGrid strokeDasharray='3 3'/>
                    <XAxis dataKey='timestamp' fontSize={8}/>
                    <YAxis />
                    { tooltip && <Tooltip /> }
                    <Legend/>
                    { props.series.map ((_serie,index) =>
                        <Bar key={index} name={props.names[index]} {...(stack? {stackId:'1'}:{})} dataKey={props.names[index]} stroke={props.series.length===1?props.colour:METRICSCOLOURS[index]} fill={props.series.length===1?props.colour:METRICSCOLOURS[index]}>
                            { index === props.series.length-1 && props.series.length > 1 && labels ? <LabelList dataKey={props.names[index]} position='insideTop' content={renderLabel}/> : null }
                        </Bar>
                    )}
                </BarChart>
            )
            break
        case ChartType.PieChart:
            dataSummarized= props.names.map( (name,index) => {
                return { name, value:(props.series[index] as ISample[]).reduce((ac,val) => ac+val.value,0)}
            })
            result = (
                <PieChart>
                    { tooltip && <Tooltip /> }
                    <Legend layout='vertical' align='right' verticalAlign='middle'/>
                    <Pie key={'asd'} data={dataSummarized} dataKey={'value'} fill={METRICSCOLOURS[0]} innerRadius={0} outerRadius={90}>
                        {dataSummarized.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={METRICSCOLOURS[index % METRICSCOLOURS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            )
            break
        case ChartType.TreemapChart:
            dataSummarized = props.names.map( (name,index) => {
                return { name, value:(props.series[index] as ISample[]).reduce((ac,val) => ac+val.value,0)}
            })
            result = (
                <div style={{paddingLeft:'32px', height:height*0.8, alignItems:'center', justifyContent:'center', display:'flex'}}>
                    <ResponsiveContainer width='100%'>
                        <Treemap data={dataSummarized} dataKey='value' nameKey='name' aspectRatio={4 / 3} stroke="#ffffff" fill="#6e5bb8" content={React.createElement(CustomizedContent)}>
                            { tooltip && <Tooltip /> }
                        </Treemap>
                    </ResponsiveContainer>
                </div>
            )
            break
        default:
            result = <Alert severity='error'>Unsupported chart type '{props.chartType}'</Alert>
            break
    }

    let title = props.metricDefinition.metric.replaceAll('_',' ')
    title = title[0].toLocaleUpperCase()+ title.substring(1)
    title = title.replaceAll('cpu', 'CPU')
    title = title.replaceAll(' fs ', ' FS ')
    title = title.replaceAll(' io ', ' IO ')
    title = title.replaceAll('oom', 'OOM')
    title = title.replaceAll('nvm', 'NVM')
    title = title.replaceAll('rss', 'RSS')
    title = title.replaceAll('failcnt', 'fail count')
    title = title.replaceAll('mbps', 'Mbps')

    // +++ review
    return (
        <Card sx={{paddingRight:'32px', width:'100%'}}>
            <CardContent>
                <Stack direction='column' alignItems='center' width='100%' sx={{mb:'32px'}}>
                    <Stack direction={'row'} alignItems={'center'}>
                        <MUITooltip key={'tooltip'+props.metricDefinition.metric+JSON.stringify(props.names)} title={<Typography style={{fontSize:12}}><b>{props.metricDefinition.metric}</b><br/><br/>{props.metricDefinition.help}</Typography>}>
                                <Typography align='center'>{title}</Typography>
                        </MUITooltip>
                        <IconButton onClick={(event) => setAnchorMenuChart(event.currentTarget)}><MoreVert fontSize='small'/></IconButton> 
                        { anchorMenuChart && <MenuChart onClose={() => setAnchorMenuChart(null)} optionSelected={menuChartOptionSelected} anchorMenu={anchorMenuChart} selected={chartType} stacked={stack} tooltip={tooltip} labels={labels} numSeries={props.numSeries} setDefault={false}/>}
                    </Stack>
                    <div style={{width:'100%'}}>
                        <ResponsiveContainer width='100%' height={height} key={props.metricDefinition.metric+JSON.stringify(props.names)}>
                            {result}
                        </ResponsiveContainer>
                    </div>
                </Stack>
            </CardContent>
        </Card>
    )
}
