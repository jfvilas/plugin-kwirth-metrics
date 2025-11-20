import React from 'react'
import { Divider, Menu, MenuItem, MenuList } from '@mui/material'
import { Timeline, ShowChart, Assessment, ViewQuilt, BarChart, Delete, DoneAll, ImportExport, Info, LocalOffer, PieChart, ExposurePlus2 } from '@material-ui/icons'

enum ChartType {
    LineChart='line',
    BarChart='bar',
    AreaChart='area',
    ValueChart='value',
    PieChart='pie',
    TreemapChart='treemap',
}

enum MenuChartOption {
    Chart='chart',
    Stack='stack',
    Tooltip='tooltip',
    Labels='labels',
    Default='default',
    Remove='remove',
    Export='export'
}

interface IProps {
    onClose:() => void
    optionSelected: (opt:MenuChartOption, data?:string) => void
    anchorMenu: Element
    selected: ChartType
    stacked: boolean
    tooltip: boolean
    labels: boolean
    numSeries: number
    setDefault: boolean
}

const MenuChart: React.FC<IProps> = (props:IProps) => {

    return <Menu id='menu-logs' anchorEl={props.anchorMenu} open={Boolean(props.anchorMenu)} onClose={props.onClose}>
        <MenuList dense sx={{width:'180px'}}>
            <MenuItem key='chartline' onClick={() => props.optionSelected(MenuChartOption.Chart, ChartType.LineChart)} selected={props.selected===ChartType.LineChart}><ShowChart/>&nbsp;Line chart</MenuItem>
            <MenuItem key='chartarea' onClick={() => props.optionSelected(MenuChartOption.Chart, ChartType.AreaChart)} selected={props.selected===ChartType.AreaChart}><Assessment/>&nbsp;Area chart</MenuItem>
            <MenuItem key='chartbar' onClick={() => props.optionSelected(MenuChartOption.Chart, ChartType.BarChart)} selected={props.selected===ChartType.BarChart}><BarChart/>&nbsp;Bar chart</MenuItem>
            <MenuItem key='chartpie' onClick={() => props.optionSelected(MenuChartOption.Chart, ChartType.PieChart)} selected={props.selected===ChartType.PieChart} disabled={props.numSeries<2}><PieChart/>&nbsp;Pie chart</MenuItem>
            <MenuItem key='chartvalue' onClick={() => props.optionSelected(MenuChartOption.Chart, ChartType.ValueChart)} selected={props.selected===ChartType.ValueChart}><ExposurePlus2/>&nbsp;Show value</MenuItem>
            <MenuItem key='charttreemap' onClick={() => props.optionSelected(MenuChartOption.Chart, ChartType.TreemapChart)} selected={props.selected===ChartType.TreemapChart}><ViewQuilt/>&nbsp;Tree map</MenuItem>
            <Divider/>
            <MenuItem key='chartstack' onClick={() => props.optionSelected(MenuChartOption.Stack)} selected={props.stacked} disabled={props.selected!==ChartType.AreaChart && props.selected!==ChartType.BarChart}><Timeline/>&nbsp;Stack values</MenuItem>
            <MenuItem key='charttooltip' onClick={() => props.optionSelected(MenuChartOption.Tooltip)} selected={props.tooltip}><Info/>&nbsp;Show tooltip</MenuItem>
            <MenuItem key='chartlabel' onClick={() => props.optionSelected(MenuChartOption.Labels)} selected={props.labels}><LocalOffer/>&nbsp;Show labels</MenuItem>
            { props.setDefault && <MenuItem key='chartdefault' onClick={() => props.optionSelected(MenuChartOption.Default)}><DoneAll/>&nbsp;Set default</MenuItem>}
            <Divider/>
            <MenuItem key='chartexport' onClick={() => props.optionSelected(MenuChartOption.Export)} ><ImportExport/>&nbsp;Export data</MenuItem>
            <MenuItem key='chartremove' disabled={true}><Delete/>&nbsp;Remove chart</MenuItem>
        </MenuList>
    </Menu>
}

export { MenuChart, MenuChartOption, ChartType }