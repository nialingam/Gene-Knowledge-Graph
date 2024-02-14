'use client'
import React, { useState } from 'react';
import { useQueryState } from 'next-usequerystate'
import { usePathname, useRouter } from 'next/navigation';
import fileDownload from 'js-file-download'
import { 
    Tooltip, 
    Chip, 
    IconButton, 
    Menu, 
    MenuItem, 
    Slider,
    Grid,
    Typography,
    Autocomplete,
    Stack,
    ListItemText,
    ListItemIcon,
    Checkbox,
    FormControlLabel,
    TextField,
    Divider
 } from '@mui/material';

import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';

import LabelIcon from '@mui/icons-material/Label';
import LabelOffIcon from '@mui/icons-material/LabelOff';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import UndoIcon from '@mui/icons-material/Undo';

import {mdiDna, 
    mdiLinkVariant,
    mdiLinkVariantOff,
    mdiGraph,
    mdiTable,
    mdiTooltip,
    mdiTooltipRemove,
    mdiPlusCircleOutline,
    mdiMinusCircleOutline
} from '@mdi/js';
import Icon from '@mdi/react';

import { toPng, toBlob, toSvg } from 'html-to-image';
import download from 'downloadjs'
import { router_push } from '@/utils/client_side';
import { NetworkSchema } from '@/app/api/knowledge_graph/route';
import { FilterSchema, process_relation } from '@/utils/helper';
import { process_tables } from '@/utils/helper';
import { layouts } from '../misc/Cytoscape';  
  
  function Form({
    edges=[],
    geneLinksRelations,
    coexpression_prediction,
    gene_link_button,
    neighborCount=100,
    genes = [],
    elements = {nodes: [], edges: []},
    searchParams
}: {
    edges: Array<string>,
    geneLinksRelations: Array<string>,
    coexpression_prediction: boolean,
    gene_link_button: boolean,
    neighborCount: number,
    genes: Array<{string}>,
    elements: null | NetworkSchema,
    searchParams: {
        filter?: string,
        fullscreen?: 'true',
        view?:string,
        tooltip?: 'true',
        legend?: 'true',
        edge_labels?: 'true',
        legend_size?: string,
        layout?: string,
    },
}) {
    const pathname = usePathname()
    const router = useRouter()

    const {
        filter:f,
        view,
        fullscreen
    } = searchParams
    const filter:FilterSchema = JSON.parse(f || '{}')
    const {
        start,
        end,
        relation:r,
        limit,
        gene_links,
        augment,
    } = filter
    const [edge_labels, setEdgeLabels] = useQueryState('edge_labels')
    const [tooltip, setTooltip] = useQueryState('tooltip')
	const [layout, setLayout] = useQueryState('layout')
	const [legend, setLegend] = useQueryState('legend')
	const [legend_size, setLegendSize] = useQueryState('legend_size')

    const relation = process_relation(r || [])
    const [error, setError] = useState<{error: string} | null>(null)
    const [anchorEl, setAnchorEl] = useState<HTMLElement>(null)
    const [anchorElLayout, setAnchorElLayout] = useState<HTMLElement>(null)
    const [augmentOpen, setAugmentOpen] = useState<boolean>(false)
    const [augmentLimit, setAugmentLimit] = useState<number>(10)
    const [geneLinksOpen, setGeneLinksOpen] = useState<boolean>(false)
    const [geneLinks, setGeneLinks] = useState<Array<string>>(gene_links || [])

    
    const handleClickMenu = (e:React.MouseEvent<HTMLButtonElement, MouseEvent>, setter:Function) => {
		setter(e.currentTarget);
	  };
	const handleCloseMenu = (setter:Function) => {
		setter(null);
	};
    return(
        <Grid container justifyContent="space-around" spacing={1}>
            <Grid item xs={12}>
                <Grid container spacing={1} alignItems="center" justifyContent="flex-start">
                    {edges.length && 
                        <Grid item xs={12} md={5}>
                            <Autocomplete
                                multiple
                                limitTags={2}
                                id="multiple-limit-tags"
                                options={edges}
                                value={relation}
                                renderInput={(params) => (
                                    <TextField {...params} label="Select Relation" placeholder="Select Relation" />
                                )}
                                sx={{ width: '350px' }}
                                onChange={(e, relation)=>{
                                    if (end || (!end && relation.length <= 5)) {
                                        const {filter: f, ...rest} = searchParams
                                        const filter = JSON.parse(f || '{}')
                                        filter.relation = relation
                                        const query = {
                                            ...rest,
                                            filter: JSON.stringify(filter)
                                        }
                                        router_push(router, pathname, query)
                                    } else if (!end && relation.length > 5) {
                                        setError({error: "Please include only 5 relationships for single search"})
                                    }
                                }}
                                renderTags={()=>null}
                            />
                        </Grid>
                        }
                    <Grid item xs={12} md={7}>
                        <Grid container spacing={1} alignItems="center">
                            {relation.map((value) => (
                                <Grid item key={value}>
                                    <Tooltip title={`${value}`} key={value} placement="top">
                                        <Chip label={value}
                                            color="primary"
                                            style={{padding: 0, borderRadius: "8px"}}
                                            onDelete={()=>{
                                                const {filter: f, ...rest} = searchParams
                                                const filter = JSON.parse(f || '{}')
                                                const rels = []
                                                for (const i of filter.relation) {
                                                    if (i !== value) {
                                                        rels.push(i)
                                                    }
                                                }
                                                filter.relation = rels
                                                const query = {
                                                    ...rest,
                                                    filter: JSON.stringify(filter)
                                                }
                                                router_push(router, pathname, query)                                                    
                                        }}/>
                                    </Tooltip>
                                </Grid>
                            ))}
                        </Grid>
                    </Grid>
                    <Grid item>
                        <Stack direction={"row"} alignItems={"center"} spacing={2}>
                            <Typography variant="subtitle2">Size:</Typography>
                            <Icon path={mdiMinusCircleOutline} size={0.8} />
                            <Tooltip title={!end ? 'Set limit per relationship:': 'Limit number of paths:'}>
                                <Slider 
                                    value={limit ? limit: !end ? relation.length === 1? ((elements || {}).edges || []).length: 5: 25}
                                    color="primary"
                                    valueLabelDisplay='auto'
                                    onChange={(e, nv)=>{
                                        const {filter: f, ...rest} = searchParams
                                        const filter = JSON.parse(f || '{}')
                                        filter.limit = nv
                                        const query = {
                                            ...rest,
                                            filter: JSON.stringify(filter)
                                        }
                                        router_push(router, pathname, query)
                                    }}
                                    min={1}
                                    max={!end ? start === "Gene" ? 100/(relation.length || 1): neighborCount : 150}
                                    sx={{width: 150}}
                                    aria-labelledby="continuous-slider"
                                />
                            </Tooltip>
                            <Icon path={mdiPlusCircleOutline} size={0.8} />
                            {/* <Typography variant="subtitle2">{limit ? limit: !end ? relation.length === 1? ((elements || {}).edges || []).length: 5: 25}</Typography> */}
                        </Stack>
                    </Grid>
                    <Grid item>
                        <Stack direction={"row"} alignItems={"center"} spacing={1}>
                            <Tooltip title={fullscreen ? "Exit full screen": "Full screen"}>
                                <IconButton color="secondary"
                                    onClick={()=>{

                                        const {fullscreen, ...rest} = searchParams
                                        const query = {...rest}
                                        if (!fullscreen) query['fullscreen'] = 'true'
                                        router_push(router, pathname, query)
                                    }}
                                    sx={{marginLeft: 5}}
                                >
                                    {fullscreen ? <FullscreenExitIcon/>: <FullscreenIcon/>}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={"Network view"}>
                                <IconButton color="secondary" 
                                    onClick={()=>{

                                        const {view, ...query} = searchParams
                                        router_push(router, pathname, query)
                                    }}
                                    style={{marginLeft: 5, borderRadius: 5, background: (!view) ? "#e0e0e0": "none"}}
                                >
                                    <Icon path={mdiGraph} size={0.8} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={"Table view"}>
                                <IconButton color="secondary" 
                                    onClick={()=>{

                                        const {view, ...query} = searchParams
                                        query['view'] = 'table'
                                        router_push(router, pathname, query)
                                    }}
                                    style={{marginLeft: 5, borderRadius: 5, background: view === "table" ? "#e0e0e0": "none"}}
                                >
                                    <Icon path={mdiTable} size={0.8} />
                                </IconButton>
                            </Tooltip>
                            <Divider sx={{backgroundColor: "secondary.main", height: 20, borderRightWidth: 1}} orientation="vertical"/>
                            <Tooltip title={"Save subnetwork"}>
                                <IconButton color="secondary" 
                                    onClick={()=>{
                                        process_tables(elements)
                                    }}
                                    style={{marginLeft: 5, borderRadius: 5}}
                                >
                                    <SaveIcon/>
                                </IconButton>
                            </Tooltip>
                            <>
                                <Tooltip title={"Download graph as an image file"}>
                                    <IconButton color="secondary"  onClick={(e)=>handleClickMenu(e, setAnchorEl)}
                                        aria-controls={anchorEl!==null ? 'basic-menu' : undefined}
                                        aria-haspopup="true"
                                        aria-expanded={anchorEl!==null ? 'true' : undefined}
                                    ><CameraAltOutlinedIcon/></IconButton>
                                </Tooltip>
                                <Menu
                                    id="basic-menu"
                                    anchorEl={anchorEl}
                                    open={anchorEl!==null}
                                    onClose={()=>handleCloseMenu(setAnchorEl)}
                                    MenuListProps={{
                                        'aria-labelledby': 'basic-button',
                                    }}
                                >
                                    <MenuItem key={'png'} onClick={()=> {
                                        handleCloseMenu(setAnchorEl)
                                        // fileDownload(cyref.current.png({output: "blob"}), "network.png")
                                        toPng(document.getElementById('kg-network'))
                                        .then(function (fileUrl) {
                                            download(fileUrl, "network.png");
                                        });
                                    }}>PNG</MenuItem>
                                    <MenuItem key={'jpg'} onClick={()=> {
                                        handleCloseMenu(setAnchorEl)
                                        // fileDownload(cyref.current.jpg({output: "blob"}), "network.jpg")
                                        toBlob(document.getElementById('kg-network'))
                                        .then(function (blob) {
                                            fileDownload(blob, "network.jpg");
                                        });
                                    }}>JPG</MenuItem>
                                    <MenuItem key={'svg'} onClick={()=> {
                                        handleCloseMenu(setAnchorEl)
                                        // fileDownload(cyref.current.svg({output: "blob"}), "network.svg")
                                        toSvg(document.getElementById('kg-network'))
                                        .then(function (dataUrl) {
                                            download(dataUrl, "network.svg")
                                        });
                                    }}>SVG</MenuItem>
                                </Menu>
                            </>
                            <Divider sx={{backgroundColor: "secondary.main", height: 20, borderRightWidth: 1}} orientation="vertical"/>
                        </Stack>
                        
                    </Grid>
                    {(!view) &&
                        <React.Fragment>
                            <Grid item>
                                <Tooltip title={tooltip ? "Hide tooltip": "Show tooltip"}>
                                    <IconButton color="secondary"
                                        onClick={()=>{
                                            if (tooltip) setTooltip(null)
                                            else setTooltip('true')
                                            
                                        }}
                                        style={{marginLeft: 5}}
                                    >
                                        {tooltip ? <Icon path={mdiTooltipRemove} size={0.8} />: <Icon path={mdiTooltip} size={0.8} />}
                                    </IconButton>
                                </Tooltip>
                            </Grid>
                            <Grid item>
                                <Tooltip title="Switch Graph Layout">
                                    <IconButton color="secondary" 
                                        onClick={(e)=>handleClickMenu(e, setAnchorElLayout)}
                                        aria-controls={anchorEl!==null ? 'basic-menu' : undefined}
                                        aria-haspopup="true"
                                        aria-expanded={anchorEl!==null ? 'true' : undefined}
                                        style={{marginLeft: 5}}
                                    >
                                        <FlipCameraAndroidIcon/>
                                    </IconButton>
                                </Tooltip>
                                <Menu
                                    id="basic-menu"
                                    anchorEl={anchorElLayout}
                                    open={anchorElLayout!==null}
                                    onClose={()=>handleCloseMenu(setAnchorElLayout)}
                                    MenuListProps={{
                                        'aria-labelledby': 'basic-button',
                                    }}
                                >
                                    { Object.entries(layouts).map(([label, {icon}])=>(
                                    <MenuItem key={label} onClick={()=> {

                                        // const {...query} = searchParams
                                        // query.layout = label
                                        // router_push(router, pathname, query)
                                        // handleCloseMenu(setAnchorElLayout)
                                        setLayout(label)
                                        
                                    }}>
                                        <ListItemIcon>
                                            {icon()}
                                        </ListItemIcon>
                                        <ListItemText>{label}</ListItemText>
                                    </MenuItem>
                                    ))}
                                </Menu>
                            </Grid>
                            <Grid item>
                                <Tooltip title={edge_labels ? "Hide edge labels": "Show edge labels"}>
                                    <IconButton color="secondary"
                                        onClick={()=>{
                                            if (edge_labels) setEdgeLabels(null)
                                            else setEdgeLabels('true')
                                            // router_push(router, pathname, query)
                                            
                                        }}
                                        style={{marginLeft: 5}}
                                    >
                                        {edge_labels ? <VisibilityOffIcon/>: <VisibilityIcon/>}
                                    </IconButton>
                                </Tooltip>
                            </Grid>  
                            { (gene_link_button) &&
                                <Grid item>
                                    <Tooltip title={"Gene-gene connections"}>
                                        <IconButton color="secondary"
                                            onClick={()=>{
                                                setGeneLinksOpen(!geneLinksOpen)
                                                setAugmentOpen(false)
                                            }}
                                            style={{marginLeft: 5}}
                                        >
                                            <Icon path={filter.gene_links ? mdiLinkVariantOff: mdiLinkVariant} size={0.8} />
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                            }
                            { (!end && start !== "Gene" && coexpression_prediction) && 
                                <Grid item>
                                    <Tooltip title={filter.augment ? "Reset network": "Augment network using co-expressed genes"}>
                                        <IconButton color="secondary" 
                                            disabled={genes.length > 100}
                                            onClick={()=>{
                                                setGeneLinksOpen(false)
                                                setAugmentOpen(!augmentOpen)
                                            }}
                                            style={{marginLeft: 5, borderRadius: 5, background: augmentOpen ? "#e0e0e0": "none"}}
                                        >
                                            <Icon path={mdiDna} size={0.8} />
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                            }
                            <Grid item>
                                <Tooltip title={!legend ? "Show legend": "Hide legend"}>
                                    <IconButton color="secondary"
                                        onClick={()=>{
                                            if (legend) {
                                                setLegend(null)
                                                setLegendSize(null)
                                            }
                                            else {
                                                setLegend('true')
                                                setLegendSize('0')
                                            }
                                            // const {legend, legend_size, ...query} = searchParams
                                            // if (!legend) query['legend'] = 'true'
                                            // router_push(router, pathname, query)
                                        }}
                                        style={{marginLeft: 5}}
                                    >
                                        {!legend ? <LabelIcon />: <LabelOffIcon />}
                                    </IconButton>
                                </Tooltip>
                            </Grid>
                            {legend &&
                                <Grid item>
                                    <Tooltip title="Adjust legend size">
                                        <IconButton color="secondary"
                                            onClick={()=>{
                                                setLegendSize(`${(parseInt(legend_size) +1)%5}`)
                                                // const {legend_size='0', ...query} = searchParams
                                                // query['legend_size'] = `${(parseInt(legend_size) +1)%5}`
                                                // router_push(router, pathname, query)
                                            }}
                                            style={{marginLeft: 5}}
                                        >
                                            {parseInt(legend_size) < 4 ? <ZoomInIcon/>: <ZoomOutIcon/>}
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                            }
                            {(geneLinksOpen) &&
                                <Grid item xs={12}>
                                    <Stack direction="row" alignItems="center" justifyContent={"flex-end"}>
                                        <Typography variant='subtitle2' style={{marginRight: 5}}>Select relationships:</Typography>
                                        {geneLinksRelations.map(i=>(
                                            <FormControlLabel key={i} control={<Checkbox checked={geneLinks.indexOf(i)>-1} onChange={()=>{
                                                if (geneLinks.indexOf(i)===-1) setGeneLinks([...geneLinks, i])
                                                else setGeneLinks(geneLinks.filter(l=>l!==i))
                                            }}/>} label={<Typography variant='subtitle2'>{i}</Typography>} />
                                        ))}
                                        <Tooltip title="Show gene links">
                                            <IconButton color="secondary" 
                                                disabled={geneLinks.length === 0}
                                                onClick={()=>{

                                                    const {filter: f, ...query} = searchParams
                                                    const filter = JSON.parse(f || '{}')
                                                    if (geneLinks.length) filter.gene_links = geneLinks
                                                    query['filter'] = JSON.stringify(filter)
                                                    router_push(router, pathname, query)
                                                }}
                                            >
                                                <SendIcon/>
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Reset network">
                                            <IconButton color="secondary"  disabled={!gene_links}
                                                onClick={()=>{

                                                    const {filter: f, ...query} = searchParams
                                                    const {gene_links, ...filter} = JSON.parse(f)
                                                    query['filter'] = filter
                                                    router_push(router, pathname, query)
                                                    setGeneLinks([])
                                                    setGeneLinksOpen(false)
                                                }}
                                            >
                                                <UndoIcon/>
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Grid>
                            }
                            {(augmentOpen) && 
                                <Grid item xs={12}>
                                    <Stack direction="row" spacing={2} alignItems="center" justifyContent={"flex-end"}>
                                        <Typography variant='subtitle2'>Top co-expressed genes:</Typography>
                                        <Slider 
                                            value={augmentLimit || 10}
                                            onChange={(e, nv:number)=>{
                                                setAugmentLimit(nv)
                                            }}
                                            min={1}
                                            max={50}
                                            valueLabelDisplay='auto'
                                            aria-labelledby="augment-limit-slider"
                                            style={{width: 100}}
                                        />
                                        <Typography variant='subtitle2'>{augmentLimit}</Typography>
                                        <Tooltip title="Augment genes">
                                            <IconButton color="secondary" 
                                                disabled={genes.length > 100}
                                                onClick={()=>{

                                                    const {filter: f, ...query} = searchParams
                                                    const filter = JSON.parse(f || '{}')
                                                    filter.augment = true
                                                    filter.augment_limit = augmentLimit || 10
                                                    
                                                    query['filter'] = JSON.stringify(filter)
                                                    router_push(router, pathname, query)
                                                    setAugmentOpen(false)
                                                }}
                                            >
                                                <SendIcon/>
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Reset network">
                                            <IconButton color="secondary"  disabled={!augment}
                                                onClick={()=>{

                                                    const {filter: f, ...query} = searchParams
                                                    const {augment, augment_limit, ...filter} = JSON.parse(f)
                                                    
                                                    query['filter'] = filter
                                                    router_push(router, pathname, query)
                                                    setAugmentOpen(false)
                                                }}
                                            >
                                                <UndoIcon/>
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Grid>
                            }
                        </React.Fragment>
                    }
                </Grid>
            </Grid>
        </Grid>
    )
}

export default Form