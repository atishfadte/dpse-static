<template>
  <div>
    <PageBand title="Contact Us" />
    <div class="container">
      <section class="contact-block">
        <h2 class="contact-h2">Contact Information</h2>
        <div class="contact-split">
          <div class="contact-split-info">
            <div class="contact-lines">
          <div class="contact-line">
            <span class="contact-ico" aria-hidden="true"><i class="svg-ico fa-solid fa-location-dot"></i></span>
            <h3>Address</h3>
            <p>
              Directorate of Planning, Statistics &amp; Evaluation,<br />
              Pandit Deendayal Upadhyay Bhavan, Behind Pundalik Devasthan,<br />
              Pundalik Nagar, Alto-Porvorim, Bardez, Goa &ndash; 403521
            </p>
          </div>
          <div class="contact-line">
            <span class="contact-ico" aria-hidden="true"><i class="svg-ico fa-solid fa-phone"></i></span>
            <h3>Phone</h3>
            <p>
              <a href="tel:+918322417439">+91-832-2417439</a><br />
              <a href="tel:+918322417445">+91-832-2417445</a>
            </p>
          </div>
          <div class="contact-line">
            <span class="contact-ico" aria-hidden="true"><i class="svg-ico fa-solid fa-fax"></i></span>
            <h3>Fax</h3>
            <p>+91-832-2417437<br />+91-832-2417443</p>
          </div>
          <div class="contact-line">
            <span class="contact-ico" aria-hidden="true"><i class="svg-ico fa-solid fa-envelope"></i></span>
            <h3>Email</h3>
            <p><a href="mailto:dir-dpse.goa@nic.in">dir-dpse.goa@nic.in</a></p>
          </div>
            </div>
          </div>

          <div>
            <div class="map-embed">
              <iframe
                :src="mapEmbedUrl"
                title="Map showing the DPSE office — Pandit Deendayal Upadhyay Bhavan, Alto-Porvorim, Bardez, Goa"
                loading="lazy"
                allowfullscreen
                referrerpolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <p>
              <a
                class="contact-link"
                :href="mapLinkUrl"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View the DPSE office location on Google Maps — opens in new window"
              >View on Google Maps <span class="ext-ico" aria-hidden="true">&#8599;</span></a>
            </p>
          </div>
        </div>
      </section>

      <section class="contact-block">
        <h2 class="contact-h2">Feedback</h2>
        <p>
          Please send your feedback and queries to
          <a href="mailto:dir-dpse.goa@nic.in">dir-dpse.goa@nic.in</a>.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Contact Us' })

const OFFICE_QUERY =
  'Directorate of Planning, Statistics and Evaluation, Pandit Deendayal Upadhyay Bhavan, Pundalik Nagar, Alto-Porvorim, Bardez, Goa 403521'
const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(OFFICE_QUERY)}&output=embed`
const mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_QUERY)}`
</script>
