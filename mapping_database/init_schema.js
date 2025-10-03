//
// MongoDB initialization script for parameter mapping system
// Creates collections and indexes for vendors, parameter_mappings, and mapping_histories
//
// This file is intended to be executed by mongosh during container startup.
//

/**
 PUBLIC_INTERFACE
 initializeMappingSchema(db)
 Initializes collections and indexes required for the parameter mapping system.

 Collections:
 - vendors
    Key fields:
      _id: ObjectId
      name: string (unique)
      code: string (unique, short code to identify vendor)
      is_active: boolean
      contact: { name, email, phone }
      metadata: object
      created_at: Date
      updated_at: Date
    Indexes:
      - { name: 1 } unique
      - { code: 1 } unique
      - { is_active: 1 }
      - { created_at: -1 }

 - parameter_mappings
    Key fields:
      _id: ObjectId
      vendor_id: ObjectId (ref vendors._id)
      source_parameter: string (the input parameter name)
      target_parameter: string (the vendor-specific parameter name)
      transform: {
        type: string|null,   // e.g., "uppercase", "lowercase", "map_value", "concat"
        config: object|null  // optional configuration for transform
      }
      is_active: boolean
      tags: [string]
      created_at: Date
      updated_at: Date
    Indexes:
      - { vendor_id: 1, source_parameter: 1 } unique
      - { vendor_id: 1, target_parameter: 1 }
      - { is_active: 1 }
      - { tags: 1 }
      - { created_at: -1 }

 - mapping_histories
    Key fields:
      _id: ObjectId
      mapping_id: ObjectId (ref parameter_mappings._id)
      vendor_id: ObjectId (denormalized for convenience)
      change_type: string ("create"|"update"|"delete")
      before: object|null
      after: object|null
      changed_by: {
        user_id: string|null,
        name: string|null
      }
      created_at: Date
    Indexes:
      - { mapping_id: 1, created_at: -1 }
      - { vendor_id: 1, created_at: -1 }
      - { change_type: 1 }
*/
function initializeMappingSchema(db) {
  // Helper to ensure a collection exists and returns it
  function ensureCollection(name) {
    const collections = db.getCollectionNames();
    if (!collections.includes(name)) {
      db.createCollection(name);
      print(`✓ Created collection: ${name}`);
    } else {
      print(`• Collection exists: ${name}`);
    }
    return db.getCollection(name);
  }

  // Vendors collection and indexes
  const vendors = ensureCollection("vendors");
  // Indexes
  vendors.createIndex({ name: 1 }, { unique: true, name: "uniq_vendor_name" });
  vendors.createIndex({ code: 1 }, { unique: true, name: "uniq_vendor_code" });
  vendors.createIndex({ is_active: 1 }, { name: "idx_vendor_active" });
  vendors.createIndex({ created_at: -1 }, { name: "idx_vendor_created_at_desc" });

  // Parameter mappings collection and indexes
  const mappings = ensureCollection("parameter_mappings");
  mappings.createIndex(
    { vendor_id: 1, source_parameter: 1 },
    { unique: true, name: "uniq_vendor_source_param" }
  );
  mappings.createIndex(
    { vendor_id: 1, target_parameter: 1 },
    { name: "idx_vendor_target_param" }
  );
  mappings.createIndex({ is_active: 1 }, { name: "idx_mapping_active" });
  mappings.createIndex({ tags: 1 }, { name: "idx_mapping_tags" });
  mappings.createIndex({ created_at: -1 }, { name: "idx_mapping_created_at_desc" });

  // Mapping histories collection and indexes
  const histories = ensureCollection("mapping_histories");
  histories.createIndex(
    { mapping_id: 1, created_at: -1 },
    { name: "idx_history_mapping_created_desc" }
  );
  histories.createIndex(
    { vendor_id: 1, created_at: -1 },
    { name: "idx_history_vendor_created_desc" }
  );
  histories.createIndex({ change_type: 1 }, { name: "idx_history_change_type" });

  // Add validator schemas (documented schema validation with $jsonSchema)
  // These validators are intentionally permissive to allow iterative evolution but still provide structure.
  db.runCommand({
    collMod: "vendors",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["name", "code", "is_active", "created_at", "updated_at"],
        properties: {
          name: { bsonType: "string", description: "Vendor display name" },
          code: { bsonType: "string", description: "Unique short code for vendor" },
          is_active: { bsonType: "bool" },
          contact: {
            bsonType: ["object", "null"],
            properties: {
              name: { bsonType: ["string", "null"] },
              email: { bsonType: ["string", "null"] },
              phone: { bsonType: ["string", "null"] }
            }
          },
          metadata: { bsonType: ["object", "null"] },
          created_at: { bsonType: "date" },
          updated_at: { bsonType: "date" }
        },
        additionalProperties: true
      }
    },
    validationLevel: "moderate"
  });

  db.runCommand({
    collMod: "parameter_mappings",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "vendor_id",
          "source_parameter",
          "target_parameter",
          "is_active",
          "created_at",
          "updated_at"
        ],
        properties: {
          vendor_id: { bsonType: "objectId" },
          source_parameter: { bsonType: "string" },
          target_parameter: { bsonType: "string" },
          transform: {
            bsonType: ["object", "null"],
            properties: {
              type: { bsonType: ["string", "null"] },
              config: { bsonType: ["object", "null"] }
            },
            additionalProperties: true
          },
          is_active: { bsonType: "bool" },
          tags: { bsonType: ["array"], items: { bsonType: "string" } },
          created_at: { bsonType: "date" },
          updated_at: { bsonType: "date" }
        },
        additionalProperties: true
      }
    },
    validationLevel: "moderate"
  });

  db.runCommand({
    collMod: "mapping_histories",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["mapping_id", "vendor_id", "change_type", "created_at"],
        properties: {
          mapping_id: { bsonType: "objectId" },
          vendor_id: { bsonType: "objectId" },
          change_type: {
            enum: ["create", "update", "delete"],
            description: "Type of change"
          },
          before: { bsonType: ["object", "null"] },
          after: { bsonType: ["object", "null"] },
          changed_by: {
            bsonType: ["object", "null"],
            properties: {
              user_id: { bsonType: ["string", "null"] },
              name: { bsonType: ["string", "null"] }
            }
          },
          created_at: { bsonType: "date" }
        },
        additionalProperties: true
      }
    },
    validationLevel: "moderate"
  });

  // Seed minimal data if vendors collection is empty
  if (vendors.countDocuments({}) === 0) {
    const now = new Date();
    vendors.insertMany([
      {
        name: "Default Vendor",
        code: "DEFAULT",
        is_active: true,
        contact: null,
        metadata: null,
        created_at: now,
        updated_at: now
      }
    ]);
    print("✓ Seeded vendors with Default Vendor");
  }

  print("✓ Mapping schema initialized (collections, indexes, validators)");
}

// Execute when run with mongosh
try {
  const currentDb = db.getName ? db : undefined;
  // In mongosh, db is a global variable. Ensure we are in the intended database.
  const targetDbName = currentDb && currentDb.getName ? currentDb.getName() : "myapp";
  print(`Initializing mapping schema in database: ${targetDbName}`);
  initializeMappingSchema(db);
} catch (e) {
  print(`Error during schema initialization: ${e.message}`);
  throw e;
}
