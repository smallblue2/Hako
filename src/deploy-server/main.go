// A program hosted on a home-lab that receives a zip
// file to unzip and deploy

package main

import (
	"archive/zip"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

var apiKey string

const (
	// Server Config
	port      = ":2002"
	maxUpload = 100 << 20 // 100MB
	// General Config
	endpoint = "/artifact"
	// Site Config
	siteDeployPath = "/var/www/site"
	siteTmpDir     = "/tmp/site-tmp"
	// LOC Config
	locDeployPath = "/var/www/loc"
	locTmpDir     = "/tmp/loc-tmp"
)

// Helper function to unzip zip files
func unzip(src, dest string) error {
	// Open zip reader
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	// For each file in the zip
	for _, f := range r.File {
		log.Printf("Unzipping: %s\n", f.Name)
		// Join the file to the destination
		fpath := filepath.Join(dest, f.Name)
		// If it's a directory, make it
		if f.FileInfo().IsDir() {
			log.Printf("Creating directory: %s\n", fpath)
			os.MkdirAll(fpath, f.Mode())
			continue
		}

		log.Printf("Extracting file to: %s\n", fpath)
		// Otherwise if it's a file, ensure all parent directories exist
		if err := os.MkdirAll(filepath.Dir(fpath), 0755); err != nil {
			return err
		}

		// Open the zip file
		inFile, err := f.Open()
		if err != nil {
			return err
		}
		defer inFile.Close()
		// Open the destination
		outFile, err := os.Create(fpath)
		if err != nil {
			return err
		}
		defer outFile.Close()

		// Copy the zip file into the destination
		if _, err := io.Copy(outFile, inFile); err != nil {
			return err
		}
	}
	return nil
}

// Helper function to copy entire directories
func copyDir(src, dst string) error {
	// Walk the entire src filetree, calling the function for each file
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Gets the path of the current node, relative to the source root
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		// Joins the relative path to the destination
		targetPath := filepath.Join(dst, relPath)
		// If it's a directory, create it
		if info.IsDir() {
			return os.MkdirAll(targetPath, info.Mode())
		}
		// Otherwise, open the current file
		from, err := os.Open(path)
		if err != nil {
			return err
		}
		defer from.Close()
		// Open the destination
		to, err := os.Create(targetPath)
		if err != nil {
			return err
		}
		defer to.Close()
		// Copy the source into the destination
		_, err = io.Copy(to, from)
		return err
	})
}

func authorise(r *http.Request) bool {
	return r.Header.Get("X-API-Key") == apiKey
}

func handleArtifact(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method no allowed. Use PUT.", http.StatusMethodNotAllowed)
		log.Printf("Incorrect method used: %s\n", r.Method)
		return
	}

	if !authorise(r) {
		http.Error(w, "Unauthorised", http.StatusUnauthorized)
		log.Printf("Unauthorised attempt (wrong API key: '%s')!\n", r.Header.Get("X-API-Key"))
		return
	}

	artifactID := r.URL.Query().Get("id")
	switch artifactID {
	case "site":
		handleSiteDeploy(w, r)
	case "loc":
		handleLOCDeploy(w, r)
	default:
		http.Error(w, "Invalid 'id' query parameter", http.StatusBadRequest)
		log.Printf("Unknown artifact id: '%s'\n", artifactID)
	}
}

func handleLOCDeploy(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(maxUpload)
	if err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		log.Printf("Failed to parse form: %v\n", err)
		return
	}

	file, header, err := r.FormFile("bundle")
	if err != nil {
		http.Error(w, "No bundle uploaded", http.StatusBadRequest)
		log.Printf("No bundle in request\n")
	}
	defer file.Close()

	extension := strings.ToLower(filepath.Ext(header.Filename))
	if extension != ".json" {
		http.Error(w, "File must be a .json", http.StatusBadRequest)
		log.Printf("File submitted for LOC deployment isn't a JSON\n")
		return
	}

	// Clean up previous tmp dir
	os.RemoveAll(locTmpDir)
	os.MkdirAll(locTmpDir, 0755)

	tmpPath := filepath.Join(locTmpDir, "loc.json")
	tmpFile, err := os.Create(tmpPath)
	if err != nil {
		http.Error(w, "Failed to copy bundle to temporary location", http.StatusInternalServerError)
		log.Printf("Failed to copy LOC bundle to temporary location\n")
		return
	}

	// Copy uploaded file into temp file
	_, err = io.Copy(tmpFile, file)
	// Close it to flush it to disk
	tmpFile.Close()
	if err != nil {
		http.Error(w, "Failed to copy LOC file to tmp file", http.StatusInternalServerError)
		log.Printf("Failed to copy LOC file to tmp file\n")
		return
	}

	// Copy uploaded file into temp file
	_, err = io.Copy(tmpFile, file)
	// Close it to flush it to disk
	tmpFile.Close()
	if err != nil {
		http.Error(w, "Failed to copy LOC file to tmp file", http.StatusInternalServerError)
		log.Printf("Failed to copy LOC file to tmp file\n")
		return
	}

	// Remove the current deployed instance
	err = os.RemoveAll(locDeployPath)
	if err != nil {
		http.Error(w, "Failed to cleanup deploy path", http.StatusInternalServerError)
		log.Printf("Failed to cleanup LOC deploy path\n")
		return
	}

	// Re-create the deploy path
	err = os.MkdirAll(locDeployPath, 0755)
	if err != nil {
		http.Error(w, "Failed to create LOC deploy path", http.StatusInternalServerError)
		log.Printf("Failed to create LOC deploy path\n")
		return
	}

	deployPath := filepath.Join(locDeployPath, "loc.json")
	deployFile, err := os.Create(deployPath)
	if err != nil {
		http.Error(w, "Failed to create LOC deploy file", http.StatusInternalServerError)
		log.Printf("Failed to create LOC deploy file\n")
		return
	}
	defer deployFile.Close()

	tmpFile, err = os.Open(tmpPath)
	if err != nil {
		http.Error(w, "Failed to open LOC tmp file again", http.StatusInternalServerError)
		log.Printf("Failed to open LOC tmp file again\n")
		return
	}
	defer tmpFile.Close()

	_, err = io.Copy(deployFile, tmpFile)
	if err != nil {
		http.Error(w, "Failed to copy LOC temporary file to LOC deploy file", http.StatusInternalServerError)
		log.Printf("Failed to copy LOC temporary file to LOC deploy file\n")
		return
	}

	w.Write([]byte("Deployed LOC!\n"))
	log.Printf("Deployed LOC!\n")
}

func handleSiteDeploy(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(maxUpload) // 100MB max
	if err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		log.Printf("Failed to parse form: %v\n", err)
		return
	}

	file, header, err := r.FormFile("bundle")
	if err != nil {
		http.Error(w, "No bundle uploaded", http.StatusBadRequest)
		log.Printf("No bundle in request\n")
		return
	}
	defer file.Close()

	extension := strings.ToLower(filepath.Ext(header.Filename))
	if extension != ".zip" {
		http.Error(w, "File must be a .zip", http.StatusBadRequest)
		log.Printf("File submitted for site deployment isn't a ZIP\n")
		return
	}

	// Clean + reset previous tmpdir
	os.RemoveAll(siteTmpDir)
	os.MkdirAll(siteTmpDir, 0755)

	// Write zip file to tmp location
	zipPath := filepath.Join(siteTmpDir, "upload.zip")
	out, err := os.Create(zipPath)
	if err != nil {
		http.Error(w, "Failed to create zip file destination", http.StatusInternalServerError)
		log.Printf("Failed to create zip file destination")
		return
	}
	_, err = io.Copy(out, file)
	if err != nil {
		http.Error(w, "Failed to copy zip file to destination", http.StatusInternalServerError)
		log.Printf("Failed to copy zip file to destination")
		return
	}
	out.Close()

	// Use helper function to unzip into the temp dir
	err = unzip(zipPath, siteTmpDir)
	if err != nil {
		http.Error(w, "Failed to unzip site bundle", http.StatusInternalServerError)
		log.Printf("Failed to unzip site bundle\n")
		return
	}

	// Remove the current deployed instance
	err = os.RemoveAll(siteDeployPath)
	if err != nil {
		http.Error(w, "Failed to cleanup site deploy path", http.StatusInternalServerError)
		log.Printf("Failed to cleanup site deploy path\n")
		return
	}

	// Re-create the deploy path
	err = os.MkdirAll(siteDeployPath, 0755)
	if err != nil {
		http.Error(w, "Failed to create site deploy path", http.StatusInternalServerError)
		log.Printf("Failed to create site deploy path\n")
		return
	}

	// Copy the tmpdir with the unzipped site to the deployed path
	err = copyDir(siteTmpDir, siteDeployPath)
	if err != nil {
		http.Error(w, "Failed to copy site files", http.StatusInternalServerError)
		log.Printf("Failed to copy site files\n")
		return
	}

	w.Write([]byte("Deployed site!\n"))
	log.Printf("Deployed site!\n")
}

func init() {
	apiKey = os.Getenv("HAKO_DEPLOY_API_KEY")
	if apiKey == "" {
		log.Fatal("HAKO_DEPLOY_API_KEY environment variable is not set!")
	}
}

func main() {
	http.HandleFunc(endpoint, handleArtifact)

	log.Printf("Listening on %s\n", port)
	http.ListenAndServe(port, nil)
}
