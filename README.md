# @REPO@

## Getting started

## Clone NerdPack
Check your profile is correct:

```
nr1 profiles:default
```

Clone the Repository
```
nr1 nerdpack:clone -r git@source.datanerd.us:rdouglas/Synthetics-Alert-Condition-Search.git
```

Enter your password

Install Node Modules:

```
cd Synthetics-Alert-Condition-Search
npm i
```

Generate a new UUID for the NerdPack:
```
nr1 nerdpack:uuid -gf
```

Serve Locally:
 - `nr1 nerdpack:serve`
 - OR `npm start`

To Publish to New Relic and Subscribe your Account:
```
nr1 nerdpack:publish
nr1 subscription:set
```
This should now appear in your account.
