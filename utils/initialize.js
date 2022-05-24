import neo4j from "neo4j-driver"
import { neo4jDriver } from "./neo4j"
import fetch from 'isomorphic-unfetch'

export default async function get_terms(node) {
  try {
	console.log(`Connecting to ${process.env.NEO4J_URL}`)
    const session = neo4jDriver.session({
      defaultAccessMode: neo4j.session.READ
    })
	let query = `MATCH (g: ${node}) RETURN *`
	if (process.env.NODE_ENV==="development") {
		console.log("Dev mode")
		let entries = {}
		let skip = 0
		const limit = 500
		while (skip < 1000) {
			const results = await session.readTransaction(txc => txc.run(`${query} SKIP ${skip} LIMIT ${limit}`))
			entries = results.records.reduce((acc, record) => {
				const g = record.get('g')
					return {...acc, [g.properties.label]: g.properties}
				}, entries)
			skip = skip + limit	
		}
		return entries
	} else {
		console.log("Starting...")
		console.log(`MATCH (g: ${node}) RETURN count(g) as count`)
		const count_r = await session.readTransaction(txc => txc.run(`MATCH (g: ${node}) RETURN count(g) as count`))
		// const count = count_r.get('count')
		const count = count_r.records[0].get('count')["low"]
		console.log("Total:",count)
		let entries = {}
		let skip = 0
		const limit = 500
		while (skip < count) {
			const results = await session.readTransaction(txc => txc.run(`${query} SKIP ${skip} LIMIT ${limit}`))
			entries = results.records.reduce((acc, record) => {
				const g = record.get('g')
					return {...acc, [g.properties.label]: g.properties}
				}, entries)
			skip = skip + limit	
		}
		return entries
	}
	
  } catch (e) {
    console.error(e)
  }
}

export const fetch_schema = async () => {
	const r = await fetch(process.env.NEXT_PUBLIC_SCHEMA)
	if (!r.ok) {
		throw new Error(`Error communicating with ${process.env.NEXT_PUBLIC_SCHEMA}`)
	}
	return await r.json()
}