import React from 'react';
import {
  BlockText,
  Card,
  CardHeader,
  CardBody,
  Select,
  SelectItem,
  HeadingText,
  Link,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  NerdGraphQuery,
  NrqlQuery,
} from 'nr1';
import ProgressBar from './progressBar';

const semver = require('semver');

// https://docs.newrelic.com/docs/new-relic-programmable-platform-introduction

export default class InfraAgentVersionsNerdletNerdlet extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      filteredHosts: [],
      allHosts: [],
      accounts: [],
      dataIsReady: false,
      completed: 0,
      loadingHosts: false,
      releases: [],
      showFilter: false,
      selectedVersion: null,
    };

    this.createVersionFilter = this.createVersionFilter.bind(this);
    this.createTable = this.createTable.bind(this);
    this._onFilter = this._onFilter.bind(this);
  }

  async componentDidMount() {
    // console.log("Getting NRQL Name")
    const _self = this;

    const gql = `
      {
        actor {
          accounts {
            id
            name
          }
        }
      }
      `;
    const accounts = await NerdGraphQuery.query({ query: gql }).then((res) => {
      if (res.data.errors) {
        throw new Error(res.data.errors);
      }
      const accounts = res.data.actor.accounts;
      console.log('accounts list', accounts);

      return accounts;
    });
    const gql2 = `{
        docs {
          agentReleases(agentName: INFRASTRUCTURE) {
            date
            version
          }
        }
      }`;
    await NerdGraphQuery.query({ query: gql2 }).then((res) => {
      if (res.data.errors) {
        throw new Error(res.data.errors);
      }
      const releases = res.data.docs.agentReleases;
      // console.log('Releases', releases);
      _self.setState({
        releases,
        selectedVersion: `${releases[0].version} - ${releases[0].date}`,
      });
      return releases;
    });
    _self.setState({ accounts });
    const hosts = await this._getHosts(accounts);
    console.log('Hosts', hosts);
    _self.setState({
      loadingHosts: false,
      showFilter: true,
      allHosts: JSON.parse(JSON.stringify(hosts)),
    });
  }

  _onFilter(event, value) {
    console.log('Picked', event.target.value);
    const filterApplied = [];
    let filtering;
    const allHosts = JSON.parse(JSON.stringify(this.state.allHosts));
    // console.log('All Hosts', this.state.allHosts);
    // console.log("Filtered Hosts", this.state.filteredHosts)
    this.setState({ selectedVersion: value });
    value = value.substring(0, value.indexOf(' -'));

    // console.log('filtering', allHosts);
    for (const host of allHosts) {
      filtering = host.hosts.filter(function (item) {
        return semver.lte(item.agentVersion, value);
      });
      host.hosts = filtering;
      filterApplied.push(host);
      // console.log('TEST', host);
    }

    this.setState({ filteredHosts: filterApplied });
  }

  createVersionFilter() {
    const releases = this.state.releases;
    const releaseItems = [];

    for (const release of releases) {
      releaseItems.push(
        <SelectItem value={`${release.version} - ${release.date}`}>
          {`${release.version} - ${release.date}`}
        </SelectItem>
      );
    }

    return (
      <Select
        label="Filter by Versions"
        spacingType={[Select.SPACING_TYPE.EXTRA_LARGE]}
        onChange={this._onFilter}
        value={this.state.selectedVersion}
      >
        {releaseItems}
      </Select>
    );
  }

  createTable() {
    const _self = this;
    const accountGroups = this.state.filteredHosts;
    const tables = [];
    // console.log("ALL HOSTS", this.state.allHosts)
    for (const accountGroup of accountGroups) {
      if (accountGroup.hosts.length > 0) {
        const versionArr = [];
        for (const host of accountGroup.hosts) {
          // console.log("Version",host.agentVersion)
          if (!versionArr.includes(`'${host.agentVersion}'`)) {
            versionArr.push(`'${host.agentVersion}'`);
          }
        }
        // console.log("Groupie lad",versionArr.toString())
        const filterString = btoa(
          `"\`tags.agentVersion\` IN (${versionArr.toString()})"`
        );
        const scopeLink = `https://one.newrelic.com/launcher/nr1-core.explorer?pane=eyJuZXJkbGV0SWQiOiJucjEtY29yZS5saXN0aW5nIiwiZG9tYWluIjoiSU5GUkEiLCJ0eXBlIjoiSE9TVCJ9
              &sidebars[0]=eyJuZXJkbGV0SWQiOiJucjEtY29yZS5jYXRlZ29yaWVzIiwic2VsZWN0ZWRDYXRlZ29yeSI6eyJkb21haW4iOiJJTkZSQSIsInR5cGUiOiJIT1NUIn19
              &platform[accountId]=${accountGroup.accountId}
              &platform[filters]=${filterString}`;

        // console.log("Groupie lad", filterString)
        tables.push(
          <>
            <HeadingText
              spacingType={[HeadingText.SPACING_TYPE.LARGE]}
              type={HeadingText.TYPE.HEADING_3}
            >
              {accountGroup.accountName} - {accountGroup.accountId}:{' '}
              <Link to={scopeLink}>Scope {versionArr.length} Versions</Link>
            </HeadingText>
            <Table items={accountGroup.hosts}>
              <TableHeader>
                <TableHeaderCell
                  value={({ item }) => item.agentVersion}
                  width="50%"
                >
                  Version
                </TableHeaderCell>
                <TableHeaderCell value={({ item }) => item.hostname}>
                  Host
                </TableHeaderCell>
              </TableHeader>

              {({ item }) => (
                <TableRow>
                  <TableRowCell>{item.agentVersion}</TableRowCell>
                  <TableRowCell>
                    <Link to={item.permalink}>{item.hostname}</Link>
                  </TableRowCell>
                </TableRow>
              )}
            </Table>
          </>
        );
      }
    }
    if (tables.length > 0) {
      return tables;
    } else {
      return (
        <BlockText
          type={BlockText.TYPE.NORMAL}
          spacingType={[BlockText.SPACING_TYPE.LARGE]}
        >
          There are no Infrastructure Agent{' '}
          <code>
            v
            {_self.state.selectedVersion.substring(
              0,
              _self.state.selectedVersion.indexOf(' -')
            )}
          </code>{' '}
          reporting in your Accounts :D
        </BlockText>
      );
    }
  }

  async _getHosts(accounts) {
    const _self = this;
    if (accounts[0]) {
      // console.log('Getting Hosts', accounts);

      const filteredHosts = [];
      _self.setState({ loadingHosts: true });

      for (const account of [accounts[0]]) {
        const accountId = account.id;
        const query =
          'SELECT uniques(agentVersion) FROM SystemSample FACET hostname, entityGuid SINCE 1 day ago';

        const finalHostGroup = await NrqlQuery.query({ accountId, query }).then(
          (res) => {
            if (res.data.errors) {
              throw new Error(res.data.errors);
            }
            // console.log('Checking NRQL', res.data.chart);
            if (res.data.chart[0]) {
              const hosts = res.data.chart;
              const accountGroup = {};

              accountGroup.accountId = accountId;
              accountGroup.accountName = account.name;
              accountGroup.hosts = [];

              for (const host of hosts) {
                const agentVersion = host.data[0].agentVersion;
                const hostname = host.metadata.groups[1].value;
                const guid = host.metadata.groups[2].value;

                const singleHost = {};
                const pane = btoa(
                  `{"nerdletId":"infra-nerdlets.host","isOverview":true,"referrers":{"launcherId":"nr1-core.explorer","nerdletId":"nr1-core.listing"},"entityId":"${guid}"}`
                );
                const sidebars = btoa(
                  `{"nerdletId":"nr1-core.actions","entityId":"${guid}","selectedNerdlet":{"nerdletId":"infra-nerdlets.host","isOverview":true}}`
                );

                singleHost.permalink = `https://one.newrelic.com/launcher/nr1-core.explorer?pane=${pane}&sidebars[0]=${sidebars}&platform[timeRange][duration]=1800000&platform[$isFallbackTimeRange]=true`;
                singleHost.agentVersion = agentVersion;
                singleHost.hostname = hostname;
                singleHost.guid = guid;
                singleHost.accountName = account.name;
                singleHost.accountId = accountId;

                // console.log('GUID', singleHost);
                accountGroup.hosts.push(singleHost);
              }
              // console.log("GROUP", accountGroup)
              return accountGroup;
            }
          }
        );
        if (finalHostGroup) {
          filteredHosts.push(finalHostGroup);
          _self.setState({ filteredHosts, dataIsReady: true });
        }

        _self.setState({ completed: _self.state.completed + 1 });
      }
      // console.log('YESSS THEY ARE DONE', filteredHosts);
      return filteredHosts;
    }
  }

  render() {
    return (
      <>
        {this.state.loadingHosts ? (
          <>
            <Card>
              <CardHeader
                title="Loading..."
                subtitle={`${this.state.accounts.length} Accounts`}
              />
              <CardBody>
                <ProgressBar
                  bgcolor="#ef6c00"
                  completed={Math.ceil(
                    (this.state.completed / this.state.accounts.length) * 100
                  )}
                />
              </CardBody>
            </Card>
          </>
        ) : null}
        {this.state.showFilter ? this.createVersionFilter() : null}
        {this.state.dataIsReady ? <>{this.createTable()}</> : null}
      </>
    );
  }
}
