package sqlite

import (
	"regexp"

	"github.com/stashapp/stash/pkg/models"
)

type queryBuilder struct {
	repository *repository

	body string

	joins         joins
	whereClauses  []string
	havingClauses []string
	args          []interface{}

	sortAndPagination string

	err error
}

func (qb queryBuilder) executeFind() ([]int, int, error) {
	if qb.err != nil {
		return nil, 0, qb.err
	}

	body := qb.body
	body += qb.joins.toSQL()

	return qb.repository.executeFindQuery(body, qb.args, qb.sortAndPagination, qb.whereClauses, qb.havingClauses)
}

func (qb *queryBuilder) addWhere(clauses ...string) {
	for _, clause := range clauses {
		if len(clause) > 0 {
			qb.whereClauses = append(qb.whereClauses, clause)
		}
	}
}

func (qb *queryBuilder) addHaving(clauses ...string) {
	for _, clause := range clauses {
		if len(clause) > 0 {
			qb.havingClauses = append(qb.havingClauses, clause)
		}
	}
}

func (qb *queryBuilder) addArg(args ...interface{}) {
	qb.args = append(qb.args, args...)
}

func (qb *queryBuilder) join(table, as, onClause string) {
	newJoin := join{
		table:    table,
		as:       as,
		onClause: onClause,
	}

	qb.joins.add(newJoin)
}

func (qb *queryBuilder) addJoins(joins ...join) {
	qb.joins.add(joins...)
}

func (qb *queryBuilder) addFilter(f *filterBuilder) {
	err := f.getError()
	if err != nil {
		qb.err = err
		return
	}

	clause, args := f.generateWhereClauses()
	if len(clause) > 0 {
		qb.addWhere(clause)
	}

	if len(args) > 0 {
		qb.addArg(args...)
	}

	clause, args = f.generateHavingClauses()
	if len(clause) > 0 {
		qb.addHaving(clause)
	}

	if len(args) > 0 {
		qb.addArg(args...)
	}

	qb.addJoins(f.getAllJoins()...)
}

func (qb *queryBuilder) handleIntCriterionInput(c *models.IntCriterionInput, column string) {
	if c != nil {
		clause, count := getIntCriterionWhereClause(column, *c)
		qb.addWhere(clause)
		if count == 1 {
			qb.addArg(c.Value)
		}
	}
}

func (qb *queryBuilder) handleStringCriterionInput(c *models.StringCriterionInput, column string) {
	if c != nil {
		if modifier := c.Modifier; c.Modifier.IsValid() {
			switch modifier {
			case models.CriterionModifierIncludes:
				clause, thisArgs := getSearchBinding([]string{column}, c.Value, false)
				qb.addWhere(clause)
				qb.addArg(thisArgs...)
			case models.CriterionModifierExcludes:
				clause, thisArgs := getSearchBinding([]string{column}, c.Value, true)
				qb.addWhere(clause)
				qb.addArg(thisArgs...)
			case models.CriterionModifierEquals:
				qb.addWhere(column + " LIKE ?")
				qb.addArg(c.Value)
			case models.CriterionModifierNotEquals:
				qb.addWhere(column + " NOT LIKE ?")
				qb.addArg(c.Value)
			case models.CriterionModifierMatchesRegex:
				if _, err := regexp.Compile(c.Value); err != nil {
					qb.err = err
					return
				}
				qb.addWhere(column + " regexp ?")
				qb.addArg(c.Value)
			case models.CriterionModifierNotMatchesRegex:
				if _, err := regexp.Compile(c.Value); err != nil {
					qb.err = err
					return
				}
				qb.addWhere(column + " NOT regexp ?")
				qb.addArg(c.Value)
			case models.CriterionModifierIsNull:
				qb.addWhere("(" + column + " IS NULL OR TRIM(" + column + ") = '')")
			case models.CriterionModifierNotNull:
				qb.addWhere("(" + column + " IS NOT NULL AND TRIM(" + column + ") != '')")
			default:
				clause, count := getSimpleCriterionClause(modifier, "?")
				qb.addWhere(column + " " + clause)
				if count == 1 {
					qb.addArg(c.Value)
				}
			}
		}
	}
}
