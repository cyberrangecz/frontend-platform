# # CyberRangeᶜᶻ Platform API Commons

A shared Angular library centered around providing a powerful, minimally-configured mapper system for translating between API data types (DTOs) and frontend models. With simple configuration, it generates mapper functions that handle automatic case conversion (camelCase ↔ snake_case), custom property mappings, and type-safe transformations. Additionally, it includes utilities for HTTP services, pagination, validation, and file operations to support comprehensive API interactions.

## Key Features

- **Minimal-Configuration Mappers**: Core functionality for creating mapper functions between DTOs and models with automatic case conversion and support for custom mappers, enabling seamless API-frontend data translation.
- **Typed HTTP Service**: Fluent API for making HTTP requests with built-in error handling, mapping integration, and pagination support.
- **Pagination**: Mappers for handling paginated responses from Java and Django backends.
- **Validation**: Presence validators and error converters for robust data validation and error handling.
- **File Operations**: Simple blob file saving utility.
- **Parameter Building**: Builders for transforming filters and pagination into HTTP parameters.

## Exported Modules

### Mapping System
- **`mapper/mapper-builder`**: Contains `MapperBuilder` class with methods like `createDTOtoModelMapper` and `createModelToDtoMapper` for generating mapper functions that translate between API DTOs and frontend models with minimal configuration.
- **`mapper/mapper-types`**: Type definitions for mapping configurations, including `ApiReadMapping` and `ApiWriteMapping` for type-safe DTO-to-model conversions, supporting automatic case conversion and custom property mappers.

### HTTP Service
- **`crczp-http.service`**: Provides a typed, fluent HTTP client (`CRCZPHttpService`) with methods for GET, POST, PUT, PATCH, and DELETE. Integrates with mappers for request/response transformations, supports pagination, and includes unified error handling.

### Pagination
- **`pagination/pagination-mapper`**: `PaginationMapper` class for converting paginated responses from Java and Django APIs to internal `OffsetPagination` models.
- **`pagination/pagination-types`**: Type definitions for pagination DTOs, including `JavaOffsetPaginationDTO`, `DjangoOffsetPaginationDTO`, and paginated resource types.

### Parameters
- **`params/params-builder`**: `ParamsBuilder` class for building HTTP parameters from filters and pagination events, supporting both Java and Django API formats.

### Validation
- **`validation/presence-validator`**: `PresenceValidator` class for validating required fields in objects and responses, with type-safe assertions.
- **`validation/errors`**: Custom error classes, such as `UnknownEnumValueError`, for handling specific validation errors.
- **`validation/json-error-converter`**: Utility function `handleJsonError` for converting blob HTTP error responses to JSON for better error handling.

### File Operations
- **`file/blob-file-saver`**: `BlobFileSaver` class for saving blob data as files using the `file-saver` library.

## Usage

Import the desired modules from `@crczp/api-common`:

```typescript
import { MapperBuilder, CRCZPHttpService } from '@crczp/api-common';

// Example: Create a mapper with minimal config
const dtoToModelMapper = MapperBuilder.createDTOtoModelMapper({
    mappedProperties: ['id', 'name'],
    mappers: {
        // Custom mapper if needed
    },
    constructor: MyModel
});
```


## Running Unit Tests

Run `nx test api-common` to execute the unit tests.
