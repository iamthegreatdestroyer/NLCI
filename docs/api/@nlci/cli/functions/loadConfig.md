[**Documentation v0.0.0**](../../../README.md)

---

[Documentation](../../../packages.md) / [@nlci/cli](../README.md) / loadConfig

# Function: loadConfig()

> **loadConfig**(`searchFrom`, `configPath?`): `Promise`\<`Partial`\<`NLCIConfig`\>\>

Defined in: [config.ts:89](https://github.com/iamthegreatdestroyer/NLCI/blob/28d49244d72abda34950f490401998a6040d837c/apps/cli/src/config.ts#L89)

Load NLCI configuration from the filesystem.

## Parameters

### searchFrom

`string`

Directory to start searching from

### configPath?

`string`

Optional explicit config file path

## Returns

`Promise`\<`Partial`\<`NLCIConfig`\>\>

Merged configuration
