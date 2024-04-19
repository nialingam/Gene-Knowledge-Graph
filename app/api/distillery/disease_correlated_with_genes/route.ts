import neo4j from "neo4j-driver"
import { neo4jDriver } from "../../../../utils/neo4j"
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from 'zod';
import { convert_query } from "@/utils/helper";

// This function returns a gene list based on a search term
const InputSchema = z.object({
    term: z.string().optional(),
    field: z.string().optional(),
    limit: z.number().optional()
})

/**
 * @swagger
 * /api/distillery/disease_correlated_with_genes:
 *   get:
 *     description: Returns a list of diseases that are correlated with genes
 *     tags:
 *       - distillery apps
 *     parameters:
 *       - name: term
 *         in: query
 *       - name: field
 *         in: query
 *       - name: limit
 *         type: integer
 *         in: query
 *     responses:
 *       200:
 *         description: Diseases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET(req: NextRequest) {
    try {
        const session = neo4jDriver.session({
            defaultAccessMode: neo4j.session.READ
        })
        try {
            const {term="", field="label", limit=100} = InputSchema.parse(convert_query(req))
            let query = `MATCH p=(a:Disease)-[r1:\`gene associated with disease or phenotype\`]-(b:Gene)`
            if (term) {
                query = query + ` WHERE a.${field} =~ $term`

            }
            query = query + "  RETURN a LIMIT TOINTEGER($limit)"
            const results = await session.readTransaction(txc => txc.run(query, {limit, term: `(?i).*${term}.*`}))
            const records = {}
            for (const record of results.records) {
                const a = record.get('a')
                const value = a.properties[field]
                if (value) records[value] = a.properties
            }
            return NextResponse.json(records, {status: 200})
            return
        } catch (error) {
            console.log(error)
            return NextResponse.json(error, {status: 400})
        } finally {
            session.close()
        }
    } catch (error) {
        return NextResponse.json(error, {status: 500})
    }
     
}