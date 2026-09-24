package com.rogplay.mediafolders

import android.content.ContentResolver
import android.provider.MediaStore
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class MediaFoldersModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("MediaFolders")

        AsyncFunction("getVideoFolders") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR_NO_CONTEXT", "React context is null", null)
                    return@AsyncFunction
                }

                val contentResolver: ContentResolver = context.contentResolver
                val folders = mutableMapOf<String, MutableMap<String, Any>>()

                val uri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                val projection = arrayOf(
                    MediaStore.Video.VideoColumns.BUCKET_ID,
                    MediaStore.Video.VideoColumns.BUCKET_DISPLAY_NAME
                )

                val cursor = contentResolver.query(
                    uri,
                    projection,
                    null,
                    null,
                    null
                )

                cursor?.use {
                    val bucketIdCol = it.getColumnIndexOrThrow(MediaStore.Video.VideoColumns.BUCKET_ID)
                    val bucketNameCol = it.getColumnIndexOrThrow(MediaStore.Video.VideoColumns.BUCKET_DISPLAY_NAME)

                    while (it.moveToNext()) {
                        val bucketId = it.getString(bucketIdCol) ?: continue
                        val bucketName = it.getString(bucketNameCol) ?: "Unknown"

                        val existing = folders[bucketId]
                        if (existing != null) {
                            existing["count"] = (existing["count"] as Int) + 1
                        } else {
                            folders[bucketId] = mutableMapOf(
                                "id" to bucketId,
                                "name" to bucketName,
                                "count" to 1
                            )
                        }
                    }
                }

                val result = folders.values.toList().sortedBy { 
                    (it["name"] as String).lowercase()
                }

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERR_MEDIA_FOLDERS", e.message ?: "Unknown error", e)
            }
        }
    }
}
