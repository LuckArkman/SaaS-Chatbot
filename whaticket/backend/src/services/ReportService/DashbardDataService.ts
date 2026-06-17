/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */
import { QueryTypes } from "sequelize";
import * as _ from "lodash";
import sequelize from "../../database";
import path from "path";
const fs = require('fs');

export interface DashboardData {
  counters: any;
  attendants: [];
}

export interface Params {
  days?: number;
  date_from?: string;
  date_to?: string;
}

export default async function DashboardDataService(
  companyId: string | number,
  params: Params
): Promise<DashboardData> {
  const query = `
    with
    traking as (
      select
        c.name "companyName",
        u.name "userName",
        u.online "userOnline",
        w.name "whatsappName",
        ct.name "contactName",
        ct.number "contactNumber",
        (t."status" = 'closed') "finished",
        (tt."userId" is null and coalesce(tt."closedAt",tt."finishedAt") is null and t."status" = 'pending') "pending",
        (t."status" = 'group') "groups",
        (t."isActiveDemand" = true) "active",
        (t."isActiveDemand" = false) "passive",
        coalesce((
          (date_part('day', age(coalesce(tt."closedAt",tt."finishedAt"))) * 24 * 60) +
          (date_part('hour', age(coalesce(tt."closedAt",tt."finishedAt"), tt."startedAt")) * 60) +
          (date_part('minutes', age(coalesce(tt."closedAt",tt."finishedAt"), tt."startedAt")))
        ), 0) "supportTime",
        coalesce((
          (date_part('day', age( tt."queuedAt", tt."startedAt")) * 24 * 60) +
          (date_part('hour', age(tt."queuedAt", tt."startedAt")) * 60) +
          (date_part('minutes', age(tt."queuedAt", tt."startedAt")))
        ), 0) "waitTime",
        t.status,
        tt.*,
        ct."id" "contactId"
      from "TicketTraking" tt
      left join "Companies" c on c.id = tt."companyId"
      left join "Users" u on u.id = tt."userId"
      left join "Whatsapps" w on w.id = tt."whatsappId"
      inner join "Tickets" t on t.id = tt."ticketId"
      left join "Contacts" ct on ct.id = t."contactId"
      -- filterPeriod
    ),
    /* counters agora é 1 único SELECT (sem UNION) */
    counters as (
      select
        (select avg("supportTime") from traking where "supportTime" > 0) "avgSupportTime",
        (select avg("waitTime")    from traking where "waitTime"    > 0) "avgWaitTime",

        (select count(id) from traking where finished)        "supportFinished",
        (
          select count(distinct "id")
          from "Tickets" t
          where status like 'open' and t."companyId" = ?
        ) "supportHappening",
        (
          select count(distinct "id")
          from "Tickets" t
          where status like 'pending' and t."companyId" = ?
        ) "supportPending",
        (select count(id) from traking where groups)          "supportGroups",

        (
          select count(leads.id) from (
            select ct1.id, count(tt1.id) total
            from traking tt1
            left join "Tickets" t1 on t1.id = tt1."ticketId"
            left join "Contacts" ct1 on ct1.id = t1."contactId"
            where ct1."createdAt" between '${params.date_from} 00:00:00' and '${params.date_to} 23:59:59'
            group by 1
            having count(tt1.id) = 1
          ) leads
        ) "leads",

        (select count(id) from traking where active)          "activeTickets",
        (select count(id) from traking where passive)         "passiveTickets",

        -- tickets na etapa NPS (mantido)
        (select count(id) from traking where "status" = 'nps') "waitRating",

        -- fechados sem avaliação (não há registro em UserRatings)
        (
          select count(distinct tt."ticketId")
          from traking tt
          where tt."status" = 'closed'
            and not exists (select 1 from "UserRatings" ur where ur."ticketId" = tt."ticketId")
        ) "withoutRating",

        -- fechados com avaliação (há registro em UserRatings)
        (
          select count(distinct tt."ticketId")
          from traking tt
          inner join "UserRatings" ur on ur."ticketId" = tt."ticketId"
        ) "withRating",

        -- % de avaliação = com avaliação / total distintos do período
        (
          (select count(distinct tt."ticketId")
             from traking tt
             inner join "UserRatings" ur on ur."ticketId" = tt."ticketId") * 100
        ) / nullif( (select count(distinct tt."ticketId") from traking tt), 0 ) "percRating",

        -- % Promotores (nota > 8)
        (
          (100 * (select count(distinct tt."ticketId")
                  from traking tt
                  inner join "UserRatings" ur on ur."ticketId" = tt."ticketId"
                  where ur."rate" > 8))
          /
          nullif( (select count(distinct tt2."ticketId")
                   from traking tt2
                   inner join "UserRatings" ur2 on ur2."ticketId" = tt2."ticketId"), 0)
        ) "npsPromotersPerc",

        -- % Neutros (7..8)
        (
          (100 * (select count(distinct tt."ticketId")
                  from traking tt
                  inner join "UserRatings" ur on ur."ticketId" = tt."ticketId"
                  where ur."rate" in (7,8)))
          /
          nullif( (select count(distinct tt2."ticketId")
                   from traking tt2
                   inner join "UserRatings" ur2 on ur2."ticketId" = tt2."ticketId"), 0)
        ) "npsPassivePerc",

        -- % Detratores (<=6)
        (
          (100 * (select count(distinct tt."ticketId")
                  from traking tt
                  inner join "UserRatings" ur on ur."ticketId" = tt."ticketId"
                  where ur."rate" < 7))
          /
          nullif( (select count(distinct tt2."ticketId")
                   from traking tt2
                   inner join "UserRatings" ur2 on ur2."ticketId" = tt2."ticketId"), 0)
        ) "npsDetractorsPerc"
    ),
    attedants as (
      select
        u1.id,
        u1."name",
        u1."online",
        avg(t."waitTime") "avgWaitTime",
        avg(t."supportTime") "avgSupportTime",
        count(t."id") "tickets",
        round(coalesce(avg(ur."rate"), 0),2) "rating",
        coalesce(count(ur."id"), 0) "countRating"
      from "Users" u1
        left join traking t on t."userId" = u1.id
        left join "UserRatings" ur on ur."userId" = t."userId" and ur."ticketId" = t."ticketId"
      where u1."companyId" = ?
      group by 1, 2
      order by u1."name"
    )
    select
      /* counters é 1 linha; agrego com max() só para manter a mesma assinatura */
      (select jsonb_build_object(
          'avgSupportTime',    max("avgSupportTime"),
          'avgWaitTime',       max("avgWaitTime"),
          'supportFinished',   max("supportFinished"),
          'supportHappening',  max("supportHappening"),
          'supportPending',    max("supportPending"),
          'supportGroups',     max("supportGroups"),
          'leads',             max("leads"),
          'activeTickets',     max("activeTickets"),
          'passiveTickets',    max("passiveTickets"),
          'waitRating',        max("waitRating"),
          'withoutRating',     max("withoutRating"),
          'withRating',        max("withRating"),
          'percRating',        max("percRating"),
          'npsPromotersPerc',  max("npsPromotersPerc"),
          'npsPassivePerc',    max("npsPassivePerc"),
          'npsDetractorsPerc', max("npsDetractorsPerc"),
          'npsScore',
            coalesce(max("npsPromotersPerc"),0) - coalesce(max("npsDetractorsPerc"),0)
        )::jsonb
       from counters
      ) counters,
      (select coalesce(json_agg(a.*), '[]')::jsonb from attedants a) attendants;
  `;

  // filtro base (empresa + período)
  let where = 'where tt."companyId" = ?';
  const replacements: any[] = [companyId];

  if (_.has(params, "days")) {
    where += ` and coalesce(tt."closedAt", tt."finishedAt", t."updatedAt", t."createdAt") >= (now() - '? days'::interval)`;
    replacements.push(parseInt(`${params.days}`.replace(/\D/g, ""), 10));
  }

  if (_.has(params, "date_from")) {
    where += ` and coalesce(tt."closedAt", tt."finishedAt", t."updatedAt", t."createdAt") >= ?`;
    replacements.push(`${params.date_from} 00:00:00`);
  }

  if (_.has(params, "date_to")) {
    where += ` and coalesce(tt."closedAt", tt."finishedAt", t."updatedAt", t."createdAt") <= ?`;
    replacements.push(`${params.date_to} 23:59:59`);
  }

  // placeholders restantes da query:
  //  - counters: supportHappening (1), supportPending (1)
  //  - attedants: where u1."companyId" = ? (1)
  replacements.push(companyId); // supportHappening
  replacements.push(companyId); // supportPending
  replacements.push(companyId); // attedants

  const finalQuery = query.replace("-- filterPeriod", where);

  const responseData: DashboardData = await sequelize.query(finalQuery, {
    replacements,
    type: QueryTypes.SELECT,
    plain: true
  });

  return responseData;
}
